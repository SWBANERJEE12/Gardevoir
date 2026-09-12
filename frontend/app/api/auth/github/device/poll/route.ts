import { NextRequest, NextResponse } from "next/server";
import { githubProfile } from "@/lib/server/github";
import { signJwt } from "@/lib/server/jwt";

export async function POST(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const deviceCode = req.cookies.get("gardevoir_device")?.value;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ detail: "GitHub sign-in is not configured." }, { status: 501 });
  }
  if (!deviceCode) {
    return NextResponse.json({ detail: "GitHub sign-in expired. Start again." }, { status: 400 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  const tokenJson = await tokenRes.json();
  if (tokenJson.error === "authorization_pending" || tokenJson.error === "slow_down") {
    return NextResponse.json({ status: tokenJson.error, interval: tokenJson.interval });
  }
  if (tokenJson.error) {
    return NextResponse.json(
      { detail: tokenJson.error_description || "GitHub sign-in was not completed." },
      { status: 400 }
    );
  }

  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ detail: "GitHub did not return an access token." }, { status: 400 });
  }

  const profile = await githubProfile(accessToken);
  const token = signJwt({
    sub: `gh_${profile.id}`,
    email: profile.email,
    name: profile.name,
    providers: ["github"],
    gh_login: profile.login,
  });
  const response = NextResponse.json({
    status: "ok",
    token,
    user: {
      id: `gh_${profile.id}`,
      email: profile.email,
      name: profile.name,
      providers: ["github"],
    },
  });
  response.cookies.set("gardevoir_gh", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set("gardevoir_device", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

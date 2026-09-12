import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ detail: "GitHub sign-in is not configured." }, { status: 501 });
  }

  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: "read:user user:email repo",
    }),
  });
  const data = await res.json();
  if (!data.device_code || !data.user_code) {
    return NextResponse.json(
      {
        detail:
          data.error_description ||
          "GitHub device sign-in is not enabled on this OAuth app. Add the Vercel callback URL in GitHub Developer settings.",
      },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    user_code: data.user_code,
    verification_uri: data.verification_uri_complete || data.verification_uri || "https://github.com/login/device",
    interval: Number(data.interval) || 5,
    expires_in: Number(data.expires_in) || 900,
  });
  response.cookies.set("gardevoir_device", String(data.device_code), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: Number(data.expires_in) || 900,
  });
  return response;
}

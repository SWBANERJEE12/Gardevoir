import { NextRequest, NextResponse } from "next/server";
import { githubProfile } from "@/lib/server/github";
import { signJwt } from "@/lib/server/jwt";
import { consumeState } from "@/lib/server/oauth-state";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const error = req.nextUrl.searchParams.get("error");
  const fail = (message: string) => NextResponse.redirect(`${origin}/auth/callback?error=${encodeURIComponent(message)}`);
  if (error) return fail("GitHub sign-in was cancelled.");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || !consumeState(state)) return fail("GitHub sign-in could not be verified.");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${origin}/api/auth/github/callback`;
  if (!clientId || !clientSecret) return fail("GitHub sign-in is not configured.");

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token as string | undefined;
    if (!accessToken) return fail("GitHub did not return an access token. Check the callback URL on the OAuth app.");
    const profile = await githubProfile(accessToken);
    const token = signJwt({
      sub: `gh_${profile.id}`,
      email: profile.email,
      name: profile.name,
      providers: ["github"],
      gh_login: profile.login,
    });
    const res = NextResponse.redirect(`${origin}/auth/callback?token=${encodeURIComponent(token)}`);
    res.cookies.set("gardevoir_gh", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https"),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return fail("GitHub sign-in failed. Check API credentials.");
  }
}

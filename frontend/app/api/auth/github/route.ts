import { NextRequest, NextResponse } from "next/server";
import { saveState } from "@/lib/server/oauth-state";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json({ detail: "GitHub sign-in is not configured." }, { status: 501 });
  }
  const origin = req.nextUrl.origin;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${origin}/api/auth/github/callback`;
  const state = saveState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email repo",
    state,
    allow_signup: "true",
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    google: false,
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  });
}

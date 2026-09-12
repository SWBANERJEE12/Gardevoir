import { NextRequest, NextResponse } from "next/server";
import { bearerToken, verifyJwt } from "@/lib/server/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req);
    if (!token) return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
    const session = verifyJwt(token);
    return NextResponse.json({
      id: session.sub,
      email: session.email,
      name: session.name,
      providers: session.providers || ["github"],
    });
  } catch {
    return NextResponse.json({ detail: "Session expired. Please sign in again." }, { status: 401 });
  }
}

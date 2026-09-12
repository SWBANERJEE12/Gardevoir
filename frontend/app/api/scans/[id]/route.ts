import { NextRequest, NextResponse } from "next/server";
import { bearerToken, verifyJwt } from "@/lib/server/jwt";
import { readScan } from "@/lib/server/scan-store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = bearerToken(req);
    if (!token) return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
    verifyJwt(token);
  } catch {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  const scan = readScan(id);
  if (!scan) return NextResponse.json({ detail: "Scan not found" }, { status: 404 });
  return NextResponse.json(scan);
}

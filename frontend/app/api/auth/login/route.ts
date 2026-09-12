import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/server/jwt";
import { scryptSync, timingSafeEqual } from "crypto";

type User = { id: string; email: string; name: string; hash: string };
const g = globalThis as typeof globalThis & { __users?: Map<string, User> };

function users() {
  if (!g.__users) g.__users = new Map();
  return g.__users;
}

function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  const candidate = scryptSync(password, salt, 32);
  const a = Buffer.from(digest, "hex");
  return a.length === candidate.length && timingSafeEqual(a, candidate);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const user = users().get(email);
  if (!user || !verifyPassword(String(body.password || ""), user.hash)) {
    return NextResponse.json({ detail: "Email or password is incorrect." }, { status: 401 });
  }
  const token = signJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    providers: ["password"],
  });
  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, providers: ["password"] },
  });
}

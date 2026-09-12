import { NextRequest, NextResponse } from "next/server";
import { randomBytes, scryptSync } from "crypto";
import { newId, signJwt } from "@/lib/server/jwt";

type User = { id: string; email: string; name: string; hash: string };
const g = globalThis as typeof globalThis & { __users?: Map<string, User> };

function users() {
  if (!g.__users) g.__users = new Map();
  return g.__users;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${digest}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || email.split("@")[0]);
  if (!email.includes("@")) return NextResponse.json({ detail: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ detail: "Password must be at least 8 characters." }, { status: 400 });
  if (users().has(email)) {
    return NextResponse.json({ detail: "An account with this email already exists. Sign in instead." }, { status: 409 });
  }
  const user: User = { id: newId(), email, name, hash: hashPassword(password) };
  users().set(email, user);
  const token = signJwt({ sub: user.id, email, name, providers: ["password"] });
  return NextResponse.json({
    token,
    user: { id: user.id, email, name, providers: ["password"] },
  });
}

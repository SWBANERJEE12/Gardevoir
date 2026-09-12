import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  providers: string[];
  gh_login?: string;
  exp: number;
  iat: number;
};

function secret() {
  return process.env.JWT_SECRET || "gardevoir-local-dev-secret-change-me";
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64url");
}

export function signJwt(payload: Omit<SessionPayload, "exp" | "iat">, days = 7) {
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + days * 24 * 60 * 60,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", secret()).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${sig}`;
}

export function verifyJwt(token: string): SessionPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid session");
  const [header, data, sig] = parts;
  const expected = createHmac("sha256", secret()).update(`${header}.${data}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid session");
  const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Session expired");
  return payload;
}

export function bearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export function newId() {
  return randomBytes(16).toString("base64url");
}

export function newState() {
  return randomBytes(24).toString("base64url");
}

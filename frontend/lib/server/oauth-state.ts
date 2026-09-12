import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return process.env.JWT_SECRET || "gardevoir-local-dev-secret-change-me";
}

export function saveState() {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", secret()).update(ts).digest("base64url");
  return `${ts}.${sig}`;
}

export function consumeState(state: string) {
  const [ts, sig] = String(state || "").split(".");
  if (!ts || !sig) return false;
  const expected = createHmac("sha256", secret()).update(ts).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const age = Date.now() - Number(ts);
  return Number.isFinite(age) && age >= 0 && age < 10 * 60 * 1000;
}

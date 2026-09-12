import { NextRequest, NextResponse } from "next/server";
import { fetchRepoBundle, parseGithubRepo } from "@/lib/server/github";
import { bearerToken, verifyJwt } from "@/lib/server/jwt";
import { buildGithubScan } from "@/lib/server/scan-github";
import { saveScan } from "@/lib/server/scan-store";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const token = bearerToken(req);
    if (!token) return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
    verifyJwt(token);
  } catch {
    return NextResponse.json({ detail: "Sign in required." }, { status: 401 });
  }

  const gh = req.cookies.get("gardevoir_gh")?.value;
  if (!gh) {
    return NextResponse.json(
      { detail: "Sign in with GitHub so Gardevoir can read the repository." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!body.authorized) {
    return NextResponse.json(
      { detail: "Authorization required. Confirm you own or may assess this repository." },
      { status: 403 }
    );
  }
  const parsed = parseGithubRepo(String(body.target_url || body.repo || ""));
  if (!parsed) {
    return NextResponse.json(
      { detail: "Paste a GitHub repo as owner/name or https://github.com/owner/name." },
      { status: 400 }
    );
  }

  const lessons = Array.isArray(body.memory) ? body.memory.map(String) : [];
  try {
    const bundle = await fetchRepoBundle(gh, parsed);
    if (!bundle.meta.id && !bundle.meta.full_name) {
      return NextResponse.json(
        { detail: "GitHub could not open that repository with this account." },
        { status: 404 }
      );
    }
    const scan = await buildGithubScan(bundle, lessons);
    saveScan(scan);
    return NextResponse.json(scan);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Repository assessment failed.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

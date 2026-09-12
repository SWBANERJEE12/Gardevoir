const GH_API = "https://api.github.com";

export type RepoRef = { owner: string; repo: string; html_url: string };

export type RepoBundle = {
  ref: RepoRef;
  meta: Record<string, unknown>;
  languages: Record<string, number>;
  files: { path: string; content: string }[];
  dependabot_alerts: unknown[];
  secret_alerts: unknown[];
  branch_protection: unknown;
};

export function parseGithubRepo(input: string): RepoRef | null {
  const raw = input.trim().replace(/\.git$/i, "");
  if (!raw) return null;
  const urlMatch = raw.match(/github\.com[:/]([^/]+)\/([^/#?\s]+)/i);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      html_url: `https://github.com/${urlMatch[1]}/${urlMatch[2]}`,
    };
  }
  const short = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (short) {
    return {
      owner: short[1],
      repo: short[2],
      html_url: `https://github.com/${short[1]}/${short[2]}`,
    };
  }
  return null;
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Gardevoir-Security-App",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`${GH_API}${path}`, { headers: ghHeaders(token), cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const INTERESTING = [
  "README.md",
  "SECURITY.md",
  "LICENSE",
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Dockerfile",
  "docker-compose.yml",
  ".github/dependabot.yml",
  ".env",
  ".env.example",
  "next.config.mjs",
  "next.config.js",
  "Cargo.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
];

function decodeContent(encoded?: string, encoding?: string) {
  if (!encoded) return "";
  if (encoding === "base64") {
    try {
      return Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf8").slice(0, 12000);
    } catch {
      return "";
    }
  }
  return String(encoded).slice(0, 12000);
}

export async function fetchRepoBundle(token: string, ref: RepoRef): Promise<RepoBundle> {
  const meta = (await gh<Record<string, unknown>>(token, `/repos/${ref.owner}/${ref.repo}`)) || {};
  const languages = (await gh<Record<string, number>>(token, `/repos/${ref.owner}/${ref.repo}/languages`)) || {};
  const defaultBranch = String(meta.default_branch || "main");
  const tree = await gh<{ tree?: { path: string; type: string }[] }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  );
  const paths = (tree?.tree || [])
    .filter((item) => item.type === "blob")
    .map((item) => item.path);

  const chosen = new Set<string>();
  for (const name of INTERESTING) {
    const hit = paths.find((p) => p === name || p.endsWith(`/${name}`));
    if (hit) chosen.add(hit);
  }
  for (const p of paths) {
    if (p.includes(".github/workflows/") && p.endsWith(".yml")) chosen.add(p);
    if (/(^|\/)\.env($|\.)/.test(p) && !p.endsWith(".example")) chosen.add(p);
  }

  const files: { path: string; content: string }[] = [];
  for (const path of Array.from(chosen).slice(0, 18)) {
    const file = await gh<{ content?: string; encoding?: string }>(
      token,
      `/repos/${ref.owner}/${ref.repo}/contents/${path}`
    );
    files.push({ path, content: decodeContent(file?.content, file?.encoding) });
  }

  const dependabot_alerts =
    (await gh<unknown[]>(token, `/repos/${ref.owner}/${ref.repo}/dependabot/alerts?state=open&per_page=20`)) || [];
  const secret_alerts =
    (await gh<unknown[]>(token, `/repos/${ref.owner}/${ref.repo}/secret-scanning/alerts?state=open&per_page=20`)) || [];
  const branch_protection = await gh(
    token,
    `/repos/${ref.owner}/${ref.repo}/branches/${encodeURIComponent(defaultBranch)}/protection`
  );

  return { ref, meta, languages, files, dependabot_alerts, secret_alerts, branch_protection };
}

export async function githubProfile(token: string) {
  const userRes = await fetch(`${GH_API}/user`, { headers: ghHeaders(token), cache: "no-store" });
  if (!userRes.ok) throw new Error("Could not read GitHub profile");
  const profile = await userRes.json();
  const emailsRes = await fetch(`${GH_API}/user/emails`, { headers: ghHeaders(token), cache: "no-store" });
  const emails = emailsRes.ok ? ((await emailsRes.json()) as { email: string; primary?: boolean; verified?: boolean }[]) : [];
  const primary = emails.find((item) => item.primary && item.verified) || emails[0];
  return {
    id: String(profile.id),
    login: String(profile.login || ""),
    name: String(profile.name || profile.login || ""),
    email: String(primary?.email || profile.email || `${profile.login}@users.noreply.github.com`),
  };
}

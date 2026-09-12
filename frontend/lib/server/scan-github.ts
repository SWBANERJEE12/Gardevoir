import type { Finding, ScanReport, ScoringReport, TestResult } from "../types";
import type { RepoBundle } from "./github";
import { analyzeRepoWithGroq, type GroqFinding } from "./groq";

const PENALTY: Record<string, number> = { CRITICAL: 25, HIGH: 15, MEDIUM: 8, LOW: 3, INFO: 0 };
const CATEGORIES = [
  ["reconnaissance", "Reconnaissance", "How much of the repository surface is visible."],
  ["tls", "Secrets / transport", "Whether credentials or insecure transport artifacts are in source."],
  ["security_headers", "GitHub security features", "Dependabot, secret scanning, and related GitHub controls."],
  ["input_validation", "Dependencies", "Lockfiles, manifests, and known dependency alerts."],
  ["authentication", "Authentication", "Credential handling and auth-related files."],
  ["authorization", "Authorization", "Visibility, branch protection, and access control."],
  ["rate_limit", "Automation", "CI workflows and abuse-resistant automation."],
] as const;

const SECRET_RE =
  /(AKIA[0-9A-Z]{16})|(ghp_[A-Za-z0-9]{20,})|(gsk_[A-Za-z0-9]{20,})|(sk-[A-Za-z0-9]{20,})|(xox[baprs]-[A-Za-z0-9-]{10,})/g;

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function finding(
  category: string,
  severity: Finding["severity"],
  title: string,
  summary: string,
  evidence: string,
  recommendation: string
): Finding {
  return {
    id: id("f"),
    test_id: category,
    category,
    severity,
    title,
    summary,
    evidence,
    confidence: 0.82,
    impact: summary,
    recommendation,
    penalty_points: PENALTY[severity] || 0,
  };
}

function heuristicFindings(bundle: RepoBundle): Finding[] {
  const out: Finding[] = [];
  const files = bundle.files;
  const names = files.map((f) => f.path);
  const meta = bundle.meta;

  if (!names.some((p) => p.toLowerCase().endsWith("security.md"))) {
    out.push(
      finding(
        "reconnaissance",
        "LOW",
        "No SECURITY.md",
        "The repository does not advertise a security policy.",
        "SECURITY.md was not found in the default branch.",
        "Add SECURITY.md with a private reporting process."
      )
    );
  }
  if (names.some((p) => /(^|\/)\.env$/.test(p) || /(^|\/)\.env\./.test(p) && !p.endsWith(".example"))) {
    out.push(
      finding(
        "tls",
        "CRITICAL",
        "Environment file committed",
        "A .env file is present in the repository and may contain secrets.",
        names.filter((p) => p.includes(".env")).join(", "),
        "Remove the file, rotate secrets, and add .env to .gitignore."
      )
    );
  }
  for (const file of files) {
    const hits = file.content.match(SECRET_RE);
    if (hits?.length) {
      out.push(
        finding(
          "authentication",
          "CRITICAL",
          `Possible secret in ${file.path}`,
          "A token-like pattern was found in source.",
          `${file.path} matched ${hits.length} secret-like pattern(s). Values are redacted.`,
          "Rotate the credential and rewrite git history if it was committed."
        )
      );
    }
  }
  if (!bundle.branch_protection && !meta.private) {
    out.push(
      finding(
        "authorization",
        "HIGH",
        "No branch protection on default branch",
        "The default branch does not appear to have protection rules.",
        `Default branch: ${String(meta.default_branch || "unknown")}`,
        "Require reviews and status checks before merge."
      )
    );
  }
  if (Array.isArray(bundle.dependabot_alerts) && bundle.dependabot_alerts.length) {
    out.push(
      finding(
        "input_validation",
        "HIGH",
        "Open Dependabot alerts",
        `${bundle.dependabot_alerts.length} open dependency alert(s) were returned by GitHub.`,
        "GitHub Dependabot alerts API",
        "Upgrade vulnerable packages and enable automated PRs."
      )
    );
  }
  if (Array.isArray(bundle.secret_alerts) && bundle.secret_alerts.length) {
    out.push(
      finding(
        "tls",
        "CRITICAL",
        "Open secret scanning alerts",
        `${bundle.secret_alerts.length} open secret scanning alert(s) were returned by GitHub.`,
        "GitHub secret scanning alerts API",
        "Revoke exposed secrets immediately."
      )
    );
  }
  if (!names.some((p) => p.includes(".github/workflows/"))) {
    out.push(
      finding(
        "rate_limit",
        "LOW",
        "No GitHub Actions workflows",
        "No CI workflow files were found, so automated security checks may be missing.",
        ".github/workflows was empty or absent",
        "Add CI that runs lint, tests, and dependency review."
      )
    );
  }
  return out;
}

function toFinding(item: GroqFinding, index: number): Finding {
  const category = CATEGORIES.some(([id]) => id === item.category) ? item.category : "reconnaissance";
  const severity = PENALTY[item.severity] != null ? item.severity : "MEDIUM";
  return {
    id: `groq-${index}-${id("x")}`,
    test_id: category,
    category,
    severity,
    title: item.title || "AI finding",
    summary: item.summary || "",
    evidence: item.evidence || "",
    confidence: 0.74,
    impact: item.impact || item.summary || "",
    recommendation: item.recommendation || "Review and remediate.",
    penalty_points: PENALTY[severity] || 0,
  };
}

function score(testResults: Record<string, TestResult>, findings: Finding[]): ScoringReport {
  const penalties = findings
    .filter((f) => f.penalty_points > 0)
    .map((f) => ({
      category: f.category,
      title: f.title,
      severity: f.severity,
      points_lost: f.penalty_points,
      reason: f.summary,
    }));
  const lost = penalties.reduce((sum, p) => sum + p.points_lost, 0);
  const overall = Math.max(0, Math.min(100, 100 - lost));
  const regions = CATEGORIES.map(([id, name, detail]) => {
    const result = testResults[id];
    const catScore =
      result?.status === "FAIL" ? 40 : result?.status === "WARN" ? 75 : result?.status === "PASS" ? 100 : 80;
    const verdict =
      catScore >= 100 ? "perfectly_secure" : catScore >= 80 ? "secure" : catScore >= 55 ? "attention" : "vulnerable";
    return {
      id,
      name,
      score: catScore,
      status: result?.status || "NOT_RUN",
      verdict: verdict as "perfectly_secure" | "secure" | "attention" | "vulnerable",
      headline:
        verdict === "perfectly_secure"
          ? "This region is perfectly secure."
          : verdict === "secure"
            ? "This region is in good shape."
            : verdict === "attention"
              ? "This region needs attention."
              : "This region is vulnerable.",
      detail: result?.summary || detail,
      finding_titles: result?.findings.map((f) => f.title) || [],
    };
  });
  const label =
    overall >= 100
      ? "PERFECT SCORE"
      : overall >= 90
        ? "NEAR PERFECT SCORE"
        : overall >= 70
          ? "WELL SECURED"
          : overall >= 55
            ? "MODERATELY SECURE"
            : overall >= 30
              ? "LOW SCORE"
              : "NOT SECURED";
  return {
    overall_score: overall,
    risk_level: label,
    score_label: label,
    score_band: label.toLowerCase().replace(/ /g, "_"),
    score_warning: overall < 30,
    passed_count: Object.values(testResults).filter((t) => t.status === "PASS").length,
    warn_count: Object.values(testResults).filter((t) => t.status === "WARN").length,
    fail_count: Object.values(testResults).filter((t) => t.status === "FAIL").length,
    inconclusive_count: 0,
    category_scores: Object.fromEntries(
      regions.map((r) => [r.id, { category: r.name, score: r.score, weight: 10, status: r.status, verdict: r.verdict, detail: r.headline }])
    ),
    penalties,
    total_points_lost: lost,
    secure_regions: regions.filter((r) => r.verdict === "perfectly_secure" || r.verdict === "secure"),
    vulnerable_regions: regions.filter((r) => r.verdict === "vulnerable"),
    attention_regions: regions.filter((r) => r.verdict === "attention"),
  };
}

export async function buildGithubScan(bundle: RepoBundle, clientLessons: string[] = []): Promise<ScanReport> {
  const started = new Date().toISOString();
  const heuristics = heuristicFindings(bundle);
  const { analysis, live, memory } = await analyzeRepoWithGroq(bundle, clientLessons);
  const groqFindings = (analysis.findings || []).map(toFinding);
  const findings = [...heuristics, ...groqFindings];
  const testResults: Record<string, TestResult> = {};
  for (const [id, name] of CATEGORIES) {
    const group = findings.filter((f) => f.category === id);
    const worst = group.some((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
      ? "FAIL"
      : group.length
        ? "WARN"
        : "PASS";
    testResults[id] = {
      test_id: id,
      name,
      category: id,
      status: worst,
      confidence: 0.8,
      summary: group[0]?.summary || `${name} checks completed for this repository.`,
      evidence: group.map((f) => f.title).join("; ") || "No issues in this region.",
      findings: group,
      duration_ms: 40,
    };
  }
  const scoring = score(testResults, findings);
  return {
    scan_id: id("scan"),
    target_url: bundle.ref.html_url,
    status: "COMPLETED",
    created_at: started,
    completed_at: new Date().toISOString(),
    tests_completed: CATEGORIES.map(([id]) => id),
    test_results: testResults,
    findings,
    scoring,
    ai_summary: {
      executive_summary: analysis.executive_summary,
      strongest_defenses: analysis.strongest_defenses,
      primary_weaknesses: analysis.primary_weaknesses,
      remediation_priorities: analysis.remediation_priorities,
      analyst_mode: live ? "LIVE" : "DEMO MODE",
      confidence: live ? 0.9 : 0.55,
    },
    timeline: [
      { timestamp: started, event_type: "SCAN_START", message: `Opened ${bundle.ref.owner}/${bundle.ref.repo}` },
      { timestamp: new Date().toISOString(), event_type: "AI_REASONING", message: live ? "Groq analyzed the repository with prior lessons." : "Heuristic analysis only; Groq was unavailable." },
      { timestamp: new Date().toISOString(), event_type: "SCAN_COMPLETE", message: `Finished with score ${scoring.overall_score}` },
    ],
    current_step: "Complete",
    learned_lessons: memory,
  } as ScanReport & { learned_lessons: string[] };
}

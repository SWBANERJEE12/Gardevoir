import { loadLessons, rememberLessons } from "./memory";
import type { RepoBundle } from "./github";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export type GroqFinding = {
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  summary: string;
  evidence: string;
  impact: string;
  recommendation: string;
};

export type GroqAnalysis = {
  executive_summary: string;
  strongest_defenses: string[];
  primary_weaknesses: string[];
  remediation_priorities: string[];
  findings: GroqFinding[];
  lessons: string[];
};

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function analyzeRepoWithGroq(
  bundle: RepoBundle,
  clientLessons: string[] = []
): Promise<{ analysis: GroqAnalysis; live: boolean; memory: string[] }> {
  const memory = await loadLessons(clientLessons);
  const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || "";
  const fallback: GroqAnalysis = {
    executive_summary: `Repository ${bundle.ref.owner}/${bundle.ref.repo} was inspected with heuristic checks.`,
    strongest_defenses: ["Repository metadata is readable through GitHub"],
    primary_weaknesses: ["Live Groq analysis was unavailable"],
    remediation_priorities: ["Enable Groq and re-run the assessment"],
    findings: [],
    lessons: [],
  };

  if (!apiKey) {
    return { analysis: fallback, live: false, memory };
  }

  const compact = {
    repo: `${bundle.ref.owner}/${bundle.ref.repo}`,
    private: bundle.meta.private,
    visibility: bundle.meta.visibility,
    default_branch: bundle.meta.default_branch,
    has_pages: bundle.meta.has_pages,
    security_and_analysis: bundle.meta.security_and_analysis,
    languages: bundle.languages,
    files: bundle.files.map((file) => ({ path: file.path, excerpt: file.content.slice(0, 3500) })),
    dependabot_open: Array.isArray(bundle.dependabot_alerts) ? bundle.dependabot_alerts.length : 0,
    secret_alerts_open: Array.isArray(bundle.secret_alerts) ? bundle.secret_alerts.length : 0,
    branch_protection: Boolean(bundle.branch_protection),
    learned_lessons: memory.slice(-24),
  };

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Gardevoir, a defensive GitHub repository security analyst. Use prior lessons to improve this assessment. Return JSON only with keys: executive_summary, strongest_defenses, primary_weaknesses, remediation_priorities, findings (array of {category, severity, title, summary, evidence, impact, recommendation}), lessons (short reusable rules learned from this repo). Categories must be one of: reconnaissance, tls, security_headers, input_validation, authentication, authorization, rate_limit. Severity: CRITICAL HIGH MEDIUM LOW INFO. Do not invent exploits. Only report issues supported by the provided repo evidence.",
          },
          {
            role: "user",
            content: JSON.stringify(compact),
          },
        ],
      }),
    });
    if (!res.ok) {
      return { analysis: fallback, live: false, memory };
    }
    const data = await res.json();
    const parsed = extractJson(data?.choices?.[0]?.message?.content || "{}");
    const findings = Array.isArray(parsed.findings) ? (parsed.findings as GroqFinding[]) : [];
    const lessons = Array.isArray(parsed.lessons) ? parsed.lessons.map(String) : [];
    const analysis: GroqAnalysis = {
      executive_summary: String(parsed.executive_summary || fallback.executive_summary),
      strongest_defenses: Array.isArray(parsed.strongest_defenses)
        ? parsed.strongest_defenses.map(String)
        : fallback.strongest_defenses,
      primary_weaknesses: Array.isArray(parsed.primary_weaknesses)
        ? parsed.primary_weaknesses.map(String)
        : fallback.primary_weaknesses,
      remediation_priorities: Array.isArray(parsed.remediation_priorities)
        ? parsed.remediation_priorities.map(String)
        : fallback.remediation_priorities,
      findings,
      lessons,
    };
    const nextMemory = await rememberLessons([
      ...lessons,
      `Assessed ${bundle.ref.owner}/${bundle.ref.repo}: ${analysis.primary_weaknesses[0] || "no major weakness stated"}`,
    ]);
    return { analysis, live: true, memory: nextMemory };
  } catch {
    return { analysis: fallback, live: false, memory };
  }
}

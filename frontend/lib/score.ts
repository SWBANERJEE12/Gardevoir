import { ScoringReport } from "./types";

export function scoreMeta(score: number, report?: ScoringReport) {
  if (report?.score_label) {
    return {
      label: report.score_label,
      band: report.score_band || "",
      warning: Boolean(report.score_warning),
    };
  }
  if (score >= 100) return { label: "PERFECT SCORE", band: "perfect", warning: false };
  if (score >= 90) return { label: "NEAR PERFECT SCORE", band: "near_perfect", warning: false };
  if (score >= 70) return { label: "WELL SECURED", band: "well_secured", warning: false };
  if (score >= 55) return { label: "MODERATELY SECURE", band: "moderately_secure", warning: false };
  if (score >= 30) return { label: "LOW SCORE", band: "low_score", warning: false };
  return { label: "NOT SECURED", band: "not_secured", warning: true };
}

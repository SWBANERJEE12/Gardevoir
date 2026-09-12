export type ResultsView =
  | "overview-score"
  | "overview-regions"
  | "overview-analyst"
  | "why_points"
  | "findings"
  | "timeline";

export function greetName(name?: string | null, email?: string | null) {
  const trimmed = (name || "").trim();
  if (trimmed) return trimmed.split(/\s+/)[0];
  const local = (email || "").split("@")[0];
  return local || "there";
}

export type PageOrigin = { x: number; y: number };

export function originFromElement(el: Element): PageOrigin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function isOverviewView(view: ResultsView) {
  return view.startsWith("overview-");
}

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type TestStatus = "PASS" | "WARN" | "FAIL" | "INCONCLUSIVE" | "ERROR" | "RUNNING" | "PENDING";

export interface Finding {
  id: string;
  test_id: string;
  category: string;
  severity: SeverityLevel;
  title: string;
  summary: string;
  evidence: string;
  confidence: number;
  impact: string;
  recommendation: string;
  penalty_points: number;
  metadata?: Record<string, any>;
}

export interface TestResult {
  test_id: string;
  name: string;
  category: string;
  status: TestStatus;
  severity?: SeverityLevel;
  confidence: number;
  summary: string;
  evidence: string;
  recommendation?: string;
  findings: Finding[];
  metadata?: Record<string, any>;
  duration_ms: number;
}

export interface PenaltyItem {
  category: string;
  title: string;
  severity: SeverityLevel;
  points_lost: number;
  reason: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
  status: string;
  verdict?: "perfectly_secure" | "secure" | "attention" | "vulnerable";
  detail?: string;
}

export interface RegionStatus {
  id: string;
  name: string;
  score: number;
  status: string;
  verdict: "perfectly_secure" | "secure" | "attention" | "vulnerable";
  headline: string;
  detail: string;
  finding_titles: string[];
}

export interface ScoringReport {
  overall_score: number;
  risk_level: string;
  score_label?: string;
  score_band?: string;
  score_warning?: boolean;
  passed_count: number;
  warn_count: number;
  fail_count: number;
  inconclusive_count: number;
  category_scores: Record<string, CategoryScore>;
  penalties: PenaltyItem[];
  total_points_lost: number;
  secure_regions?: RegionStatus[];
  vulnerable_regions?: RegionStatus[];
  attention_regions?: RegionStatus[];
}

export interface TimelineEvent {
  timestamp: string;
  event_type: "SCAN_START" | "TEST_START" | "TEST_COMPLETE" | "AI_REASONING" | "AI_DECISION" | "SCAN_COMPLETE" | "ERROR";
  message: string;
  details?: Record<string, any>;
  test_id?: string;
}

export interface AISecuritySummary {
  executive_summary: string;
  strongest_defenses: string[];
  primary_weaknesses: string[];
  remediation_priorities: string[];
  analyst_mode: "LIVE" | "DEMO MODE";
  confidence: number;
}

export interface ScanReport {
  scan_id: string;
  target_url: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  created_at: string;
  completed_at?: string;
  tests_completed: string[];
  test_results: Record<string, TestResult>;
  findings: Finding[];
  scoring?: ScoringReport;
  ai_summary?: AISecuritySummary;
  timeline: TimelineEvent[];
  current_step: string;
  learned_lessons?: string[];
}

export interface DemoTargetInfo {
  name: string;
  url: string;
  description: string;
  scenarios: {
    category: string;
    test: string;
    expected: string;
  }[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  providers: string[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ProviderStatus {
  google: boolean;
  github: boolean;
}

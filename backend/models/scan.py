from pydantic import BaseModel, Field
from typing import Literal, Optional, Any
from datetime import datetime

SeverityLevel = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
TestStatus = Literal["PASS", "WARN", "FAIL", "INCONCLUSIVE", "ERROR", "RUNNING", "PENDING"]

class Finding(BaseModel):
    id: str
    test_id: str
    category: str
    severity: SeverityLevel
    title: str
    summary: str
    evidence: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    impact: str
    recommendation: str
    penalty_points: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)

class TestResult(BaseModel):
    test_id: str
    name: str
    category: str
    status: TestStatus
    severity: Optional[SeverityLevel] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    summary: str
    evidence: str
    recommendation: Optional[str] = None
    findings: list[Finding] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    duration_ms: int = 0

class PenaltyItem(BaseModel):
    category: str
    title: str
    severity: SeverityLevel
    points_lost: int
    reason: str

class CategoryScore(BaseModel):
    category: str
    score: int
    weight: int
    status: str

class ScoringReport(BaseModel):
    overall_score: int
    risk_level: Literal["CRITICAL RISK", "HIGH RISK", "MODERATE RISK", "LOW RISK", "SECURE"]
    passed_count: int
    warn_count: int
    fail_count: int
    inconclusive_count: int
    category_scores: dict[str, CategoryScore]
    penalties: list[PenaltyItem]
    total_points_lost: int

class TimelineEvent(BaseModel):
    timestamp: str
    event_type: Literal["SCAN_START", "TEST_START", "TEST_COMPLETE", "AI_REASONING", "AI_DECISION", "SCAN_COMPLETE", "ERROR"]
    message: str
    details: Optional[dict[str, Any]] = None
    test_id: Optional[str] = None

class ScanRequest(BaseModel):
    target_url: str
    authorized: bool = False

class AISecuritySummary(BaseModel):
    executive_summary: str
    strongest_defenses: list[str]
    primary_weaknesses: list[str]
    remediation_priorities: list[str]
    analyst_mode: Literal["LIVE", "DEMO MODE"]
    confidence: float = 0.95

class ScanReport(BaseModel):
    scan_id: str
    target_url: str
    status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED"]
    created_at: str
    completed_at: Optional[str] = None
    tests_completed: list[str] = Field(default_factory=list)
    test_results: dict[str, TestResult] = Field(default_factory=dict)
    findings: list[Finding] = Field(default_factory=list)
    scoring: Optional[ScoringReport] = None
    ai_summary: Optional[AISecuritySummary] = None
    timeline: list[TimelineEvent] = Field(default_factory=list)
    current_step: str = "Initialized"

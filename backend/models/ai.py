from pydantic import BaseModel, Field
from typing import Literal

class AIPlannerDecision(BaseModel):
    next_test: str
    reason: str
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)
    stop_reason: str = ""
    should_stop: bool = False

class AIObservationPayload(BaseModel):
    target: str
    completed_tests: list[str]
    observations: dict[str, str]
    findings: list[dict]
    available_tests: list[str]

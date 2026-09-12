import json
import logging
from config import settings
from models.ai import AIPlannerDecision, AIObservationPayload
from models.scan import AISecuritySummary, Finding
from ai.planner import validate_and_sanitize_decision
from ai.mock_ai import mock_plan_next_test, mock_generate_summary
from ai.prompts import AI_SECURITY_ANALYST_SYSTEM_PROMPT, AI_SUMMARY_SYSTEM_PROMPT

logger = logging.getLogger("sentinel.ai")

class AISecurityAnalyst:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY or settings.AI_API_KEY
        self.base_url = settings.AI_BASE_URL
        self.model = settings.AI_MODEL
        self.is_live = bool(self.api_key and self.api_key.strip())

    async def decide_next_assessment(self, payload: AIObservationPayload) -> tuple[AIPlannerDecision, str]:
        """
        Observes previous test results, reasons about security posture,
        and selects the next safe assessment.
        Returns: (decision, analyst_mode)
        """
        # If no key, immediately use smart mock AI
        if not self.is_live:
            decision = mock_plan_next_test(payload)
            _, sanitized = validate_and_sanitize_decision(decision, payload.completed_tests, payload.available_tests)
            return sanitized, "DEMO MODE"

        # Attempt live AI query
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            
            prompt_content = json.dumps({
                "target": payload.target,
                "completed_tests": payload.completed_tests,
                "observations": payload.observations,
                "findings": payload.findings,
                "available_tests": [t for t in payload.available_tests if t not in payload.completed_tests]
            }, indent=2)

            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": AI_SECURITY_ANALYST_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Observations payload:\n{prompt_content}"}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            raw_text = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_text)
            decision = AIPlannerDecision(**parsed)
            
            is_valid, sanitized = validate_and_sanitize_decision(decision, payload.completed_tests, payload.available_tests)
            return sanitized, "LIVE"

        except Exception as e:
            logger.warning(f"Live AI API call failed ({e}). Gracefully falling back to deterministic mock AI analyst.")
            decision = mock_plan_next_test(payload)
            _, sanitized = validate_and_sanitize_decision(decision, payload.completed_tests, payload.available_tests)
            return sanitized, "DEMO MODE"

    async def generate_summary_report(self, findings: list[Finding]) -> AISecuritySummary:
        """Generates executive security summary and remediation priorities."""
        if not self.is_live:
            return mock_generate_summary(findings)

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            
            findings_data = [f.model_dump() for f in findings]
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": AI_SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Assessment findings: {json.dumps(findings_data)}"}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            raw_text = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_text)
            
            return AISecuritySummary(
                executive_summary=parsed.get("executive_summary", "Security assessment complete."),
                strongest_defenses=parsed.get("strongest_defenses", ["Baseline security controls"]),
                primary_weaknesses=parsed.get("primary_weaknesses", ["Identified weaknesses"]),
                remediation_priorities=parsed.get("remediation_priorities", ["Address high priority findings"]),
                analyst_mode="LIVE",
                confidence=0.95
            )
        except Exception as e:
            logger.warning(f"Live AI summary generation failed ({e}). Using mock summary.")
            return mock_generate_summary(findings)

ai_analyst = AISecurityAnalyst()

from models.ai import AIPlannerDecision
from security_policy import ALLOWLISTED_TEST_IDS

def validate_and_sanitize_decision(
    decision: AIPlannerDecision,
    completed_tests: list[str],
    available_tests: list[str]
) -> tuple[bool, AIPlannerDecision]:
    """
    Validates that the AI's selected assessment is allowlisted and not yet run.
    If invalid or already executed, selects the highest-priority safe remaining test.
    """
    if decision.should_stop:
        return True, decision

    next_test = decision.next_test.strip().lower()

    # Rule 1: Must be in allowlist
    if next_test not in ALLOWLISTED_TEST_IDS:
        # Fallback to first available allowlisted test
        remaining = [t for t in available_tests if t not in completed_tests]
        if not remaining:
            return True, AIPlannerDecision(
                next_test="",
                reason="All allowlisted assessments have completed.",
                should_stop=True,
                stop_reason="All assessments completed."
            )
        fallback_test = remaining[0]
        return False, AIPlannerDecision(
            next_test=fallback_test,
            reason=f"AI suggested invalid assessment '{next_test}'. Safely redirected to allowlisted test: {fallback_test}.",
            priority="medium",
            confidence=0.80
        )

    # Rule 2: Must not be already completed
    if next_test in completed_tests:
        remaining = [t for t in available_tests if t not in completed_tests]
        if not remaining:
            return True, AIPlannerDecision(
                next_test="",
                reason="All assessments completed.",
                should_stop=True,
                stop_reason="All assessments completed."
            )
        fallback_test = remaining[0]
        return False, AIPlannerDecision(
            next_test=fallback_test,
            reason=f"Assessment '{next_test}' was already completed. Safely advanced to next pending test: {fallback_test}.",
            priority="medium",
            confidence=0.85
        )

    return True, decision

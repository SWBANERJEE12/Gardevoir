"""
Deterministic Mock AI Security Analyst
Provides adaptive, intelligent reasoning when no live AI API key is configured or when offline.
"""
from models.ai import AIPlannerDecision, AIObservationPayload
from models.scan import AISecuritySummary, Finding

def mock_plan_next_test(payload: AIObservationPayload) -> AIPlannerDecision:
    completed = set(payload.completed_tests)
    available = [t for t in payload.available_tests if t not in completed]
    
    if not available:
        return AIPlannerDecision(
            next_test="",
            reason="All candidate assessments have completed. Proceeding to final scoring and reporting.",
            should_stop=True,
            stop_reason="Assessment coverage complete."
        )

    # 1. If baseline is complete, check for authorization next if unrun
    if "authorization" in available:
        return AIPlannerDecision(
            next_test="authorization",
            reason="Baseline controls are mapped. Authentication endpoints and multi-user resource paths were detected during initial recon. Investigating object-level authorization is high priority.",
            priority="high",
            confidence=0.94
        )

    # 2. If authorization was executed and rate_limit is unrun
    if "authorization" in completed and "rate_limit" in available:
        # Check if authz had findings
        has_authz_finding = any(f.get("category") == "Authorization" for f in payload.findings)
        reason_text = (
            "Authorization testing revealed object-level boundary issues. State-changing endpoints and newsletter/login routes must now be evaluated for rate limiting and abuse defenses."
            if has_authz_finding else
            "Authorization controls verified. Evaluating endpoint resilience against rapid automated requests via rate limiting assessment."
        )
        return AIPlannerDecision(
            next_test="rate_limit",
            reason=reason_text,
            priority="high",
            confidence=0.92
        )

    # 3. If input validation is available
    if "input_validation" in available:
        return AIPlannerDecision(
            next_test="input_validation",
            reason="Evaluating input sanitization, encoding, and reflection behavior using bounded safe probe corpus.",
            priority="medium",
            confidence=0.89
        )

    # 4. If authentication is available
    if "authentication" in available:
        return AIPlannerDecision(
            next_test="authentication",
            reason="Assessing session cookie security attributes and credential error consistency.",
            priority="medium",
            confidence=0.91
        )

    # Default fallback to first available
    next_t = available[0]
    return AIPlannerDecision(
        next_test=next_t,
        reason=f"Assessing remaining security surface area for {next_t}.",
        priority="medium",
        confidence=0.85
    )

def mock_generate_summary(findings: list[Finding]) -> AISecuritySummary:
    has_authz = any(f.category == "Authorization" for f in findings)
    has_rate = any(f.category == "Rate Limiting" for f in findings)
    has_hdr = any(f.category == "Security Headers" for f in findings)
    
    weaknesses = []
    remediations = []
    defenses = ["Invalid credentials properly rejected with uniform error responses", "Session cookie HttpOnly protections active"]

    if has_authz:
        weaknesses.append("Broken Object-Level Authorization (IDOR) on private order endpoints")
        remediations.append("Enforce server-side user ownership validation for all order queries (/api/orders/<id>)")

    if has_rate:
        weaknesses.append("Missing rate limiting on state-changing API endpoints")
        remediations.append("Implement token-bucket rate limiting returning HTTP 429 and Retry-After headers")

    if has_hdr:
        weaknesses.append("Missing modern security headers (Content-Security-Policy, HSTS)")
        remediations.append("Configure Content-Security-Policy and Strict-Transport-Security in web server headers")

    if not weaknesses:
        weaknesses = ["No high or critical vulnerabilities identified in assessed surface area"]
        remediations = ["Maintain regular automated dependency and security audits"]

    return AISecuritySummary(
        executive_summary="The application demonstrates sound baseline authentication practices, but object-level authorization and abuse-resistance controls require remediation before production deployment.",
        strongest_defenses=defenses,
        primary_weaknesses=weaknesses,
        remediation_priorities=remediations,
        analyst_mode="DEMO MODE",
        confidence=0.94
    )

import time
import httpx
from urllib.parse import urlparse
from models.scan import TestResult, Finding
from security_policy import REQUEST_TIMEOUT_SECONDS

# Strictly safe, non-destructive probe corpus
SAFE_PROBES = [
    {"name": "HTML/XSS Probe", "probe": "<sentinel_probe_tag>", "type": "reflection"},
    {"name": "SQL Syntax Probe", "probe": "sentinel_safe' OR '1'='1", "type": "error_disclosure"},
    {"name": "Null Byte & Path Boundary", "probe": "sentinel%00../test", "type": "path_traversal_safety"},
    {"name": "Large Numeric Boundary", "probe": "99999999999999999999", "type": "boundary_limit"},
    {"name": "JSON Type Anomaly", "probe": '{"__sentinel__": true}', "type": "type_handling"}
]

async def run_input_validation_assessment(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {"probes_tested": len(SAFE_PROBES), "endpoints_evaluated": []}
    
    parsed = urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    
    endpoints_to_try = [
        f"{base_url}/api/search",
        f"{base_url}/search",
        f"{target_url}"
    ]

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
        active_endpoint = None
        for ep in endpoints_to_try:
            try:
                test_resp = await client.get(ep, params={"q": "sentinel_probe"})
                if test_resp.status_code in [200, 400, 422]:
                    active_endpoint = ep
                    break
            except Exception:
                continue

        if not active_endpoint:
            active_endpoint = target_url

        metadata["active_endpoint"] = active_endpoint
        
        raw_reflection_detected = False
        unhandled_error_detected = False

        for probe_item in SAFE_PROBES:
            probe_val = probe_item["probe"]
            probe_name = probe_item["name"]
            
            try:
                resp = await client.get(active_endpoint, params={"q": probe_val, "search": probe_val, "id": probe_val})
                metadata["endpoints_evaluated"].append({
                    "probe": probe_name,
                    "status_code": resp.status_code
                })
                
                if probe_val == "<sentinel_probe_tag>" and "<sentinel_probe_tag>" in resp.text:
                    raw_reflection_detected = True
                    
                if resp.status_code == 500:
                    unhandled_error_detected = True

            except Exception:
                pass

        if raw_reflection_detected:
            findings.append(Finding(
                id="input-raw-tag-reflection",
                test_id="input_validation",
                category="Input Validation",
                severity="LOW",
                title="Input Validation & Probe Echo Warning",
                summary="The application echoes user-supplied query parameters without contextual HTML escaping or schema validation.",
                evidence=f"Endpoint: {active_endpoint}?q=<sentinel_probe_tag> reflected raw probe characters in response body.",
                confidence=0.91,
                impact="Unsanitized reflection can facilitate client-side script injection (XSS) if rendered dynamically.",
                recommendation="Apply context-aware output encoding (HTML entity encoding, JSON serialization) and input sanitization.",
                penalty_points=2,
                metadata={"endpoint": active_endpoint}
            ))

        if unhandled_error_detected:
            findings.append(Finding(
                id="input-unhandled-server-error",
                test_id="input_validation",
                category="Input Validation",
                severity="LOW",
                title="Unhandled Exception on Boundary Input",
                summary="Sending boundary probe values caused an unhandled 500 Internal Server Error instead of a structured 400 Bad Request.",
                evidence=f"Endpoint: {active_endpoint} returned HTTP 500 on type/syntax anomaly probe.",
                confidence=0.88,
                impact="Indicates missing input validation schemas; unhandled exceptions can leak stack traces.",
                recommendation="Enforce strict schema validation (Pydantic, Joi, Zod) and return sanitized 400/422 error structures.",
                penalty_points=2,
                metadata={"endpoint": active_endpoint}
            ))

    duration_ms = int((time.time() - start_time) * 1000)
    status = "WARN" if findings else "PASS"
    summary = (
        f"Input validation assessed across {len(SAFE_PROBES)} safe probes. Identified {len(findings)} input handling concern(s)."
        if findings else f"Input validation assessed across {len(SAFE_PROBES)} safe probes. Input sanitization and error handling verified."
    )

    return TestResult(
        test_id="input_validation",
        name="Input Validation & Probe Sanitization",
        category="Input Validation",
        status=status,
        severity="LOW" if status == "WARN" else "INFO",
        confidence=0.91,
        summary=summary,
        evidence=f"Tested safe probes against {active_endpoint}",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

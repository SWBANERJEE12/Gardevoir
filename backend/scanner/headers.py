import time
import httpx
from models.scan import TestResult, Finding
from security_policy import REQUEST_TIMEOUT_SECONDS

async def run_security_headers_assessment(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(target_url)
            headers = {k.lower(): v for k, v in resp.headers.items()}
            metadata["headers_inspected"] = list(headers.keys())

            # 1. Content-Security-Policy / Security Policy
            csp = headers.get("content-security-policy")
            if not csp:
                findings.append(Finding(
                    id="hdr-missing-csp",
                    test_id="security_headers",
                    category="Security Headers",
                    severity="LOW",
                    title="Missing Content Security Policy (CSP)",
                    summary="No Content-Security-Policy header was detected on the primary response.",
                    evidence="Header 'Content-Security-Policy' is absent from HTTP response.",
                    confidence=0.95,
                    impact="Increases vulnerability to Cross-Site Scripting (XSS), clickjacking, and data injection attacks.",
                    recommendation="Define a robust Content-Security-Policy restricting scripts, styles, and resource origins.",
                    penalty_points=3
                ))
            else:
                metadata["csp"] = csp

            # 2. Strict-Transport-Security (HSTS) - Only flag for remote production targets
            hsts = headers.get("strict-transport-security")
            if not hsts and not target_url.startswith("http://localhost") and not target_url.startswith("http://127.0.0.1"):
                findings.append(Finding(
                    id="hdr-missing-hsts",
                    test_id="security_headers",
                    category="Security Headers",
                    severity="LOW",
                    title="Missing Strict-Transport-Security (HSTS)",
                    summary="The response does not include the Strict-Transport-Security header.",
                    evidence="Header 'Strict-Transport-Security' is absent.",
                    confidence=0.95,
                    impact="Clients may communicate over unencrypted HTTP.",
                    recommendation="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to HTTPS responses.",
                    penalty_points=3
                ))
            elif hsts:
                metadata["hsts"] = hsts

            # 3. X-Content-Type-Options
            xcto = headers.get("x-content-type-options")
            if xcto:
                metadata["x_content_type_options"] = xcto

            # 4. X-Frame-Options
            xfo = headers.get("x-frame-options")
            if xfo:
                metadata["x_frame_options"] = xfo

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return TestResult(
            test_id="security_headers",
            name="HTTP Security Headers",
            category="Security Headers",
            status="ERROR",
            severity="LOW",
            confidence=0.5,
            summary=f"Failed to inspect security headers: {str(e)}",
            evidence=str(e),
            findings=[],
            duration_ms=duration_ms
        )

    duration_ms = int((time.time() - start_time) * 1000)
    status = "WARN" if findings else "PASS"

    return TestResult(
        test_id="security_headers",
        name="HTTP Security Headers",
        category="Security Headers",
        status=status,
        severity="LOW" if status == "WARN" else "INFO",
        confidence=0.95,
        summary=f"Security headers evaluated. Identified {len(findings)} recommended header enhancement(s).",
        evidence=f"Inspected HTTP response headers from {target_url}",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

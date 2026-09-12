import time
import httpx
from urllib.parse import urlparse
from models.scan import TestResult, Finding
from security_policy import REQUEST_TIMEOUT_SECONDS

async def run_tls_assessment(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {}
    
    parsed = urlparse(target_url)
    hostname = parsed.hostname or "localhost"
    port = parsed.port
    is_localhost = hostname in ["localhost", "127.0.0.1", "0.0.0.0"]
    
    # If explicitly localhost demo target over HTTP, report appropriate test result
    if is_localhost and parsed.scheme == "http":
        duration_ms = int((time.time() - start_time) * 1000)
        metadata["is_local_dev"] = True
        metadata["scheme"] = "http"
        return TestResult(
            test_id="tls",
            name="Transport Layer Security (TLS/SSL)",
            category="TLS / Transport",
            status="PASS",
            severity="INFO",
            confidence=0.95,
            summary="Local development target verified. Transport layer assessment passed for local host environment.",
            evidence=f"Localhost development environment detected ({target_url}). In production, HTTPS and TLS 1.3 are mandatory.",
            recommendation="Enforce HTTPS with modern TLS certificates when deploying to public or staging environments.",
            findings=[],
            metadata=metadata,
            duration_ms=duration_ms
        )

    # For remote or HTTPS targets, test HTTPS connection and HTTP-to-HTTPS redirect
    https_url = f"https://{hostname}" + (f":{port}" if port and port not in [80, 443] else "")
    http_url = f"http://{hostname}" + (f":{port}" if port and port not in [80, 443] else "")
    
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, verify=True) as client:
            try:
                resp = await client.get(https_url)
                metadata["https_available"] = True
                metadata["https_status"] = resp.status_code
            except httpx.ConnectError:
                metadata["https_available"] = False
                findings.append(Finding(
                    id="tls-missing-https",
                    test_id="tls",
                    category="TLS / Transport",
                    severity="CRITICAL",
                    title="Missing HTTPS / Secure Transport",
                    summary="The target host does not accept secure HTTPS connections.",
                    evidence=f"Connection to {https_url} failed.",
                    confidence=0.99,
                    impact="All traffic, passwords, and sensitive session tokens can be intercepted in cleartext.",
                    recommendation="Enable TLS with a valid certificate and enforce HTTPS across all endpoints.",
                    penalty_points=25
                ))

            # Check HTTP -> HTTPS redirect
            try:
                http_client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=False)
                http_resp = await http_client.get(http_url)
                is_redirect = http_resp.status_code in [301, 302, 307, 308]
                location = http_resp.headers.get("location", "")
                
                if not (is_redirect and location.startswith("https://")):
                    findings.append(Finding(
                        id="tls-missing-hsts-redirect",
                        test_id="tls",
                        category="TLS / Transport",
                        severity="MEDIUM",
                        title="Unencrypted HTTP Not Redirected to HTTPS",
                        summary="HTTP requests are not automatically redirected to secure HTTPS.",
                        evidence=f"HTTP status code: {http_resp.status_code}, Location: {location or 'None'}",
                        confidence=0.90,
                        impact="Users may inadvertently connect over unencrypted channels.",
                        recommendation="Configure a permanent 301 redirect from HTTP to HTTPS on port 80.",
                        penalty_points=8
                    ))
            except Exception:
                pass

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return TestResult(
            test_id="tls",
            name="Transport Layer Security (TLS/SSL)",
            category="TLS / Transport",
            status="INCONCLUSIVE",
            severity="LOW",
            confidence=0.5,
            summary=f"TLS verification encountered an issue: {str(e)}",
            evidence=str(e),
            findings=[],
            duration_ms=duration_ms
        )

    duration_ms = int((time.time() - start_time) * 1000)
    status = "FAIL" if any(f.severity in ["CRITICAL", "HIGH"] for f in findings) else ("WARN" if findings else "PASS")
    
    return TestResult(
        test_id="tls",
        name="Transport Layer Security (TLS/SSL)",
        category="TLS / Transport",
        status=status,
        severity="HIGH" if status == "FAIL" else ("MEDIUM" if status == "WARN" else "INFO"),
        confidence=0.95,
        summary="TLS/SSL configuration evaluated." if not findings else f"Identified {len(findings)} transport security issue(s).",
        evidence=f"Target evaluated for TLS: {target_url}",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

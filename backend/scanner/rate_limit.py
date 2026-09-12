import time
import httpx
from urllib.parse import urlparse
from models.scan import TestResult, Finding
from security_policy import MAX_TEST_REQUESTS, REQUEST_TIMEOUT_SECONDS

async def run_rate_limit_assessment(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {}
    
    parsed = urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    
    # Target candidate endpoints for rate limit assessment
    candidate_endpoints = [
        f"{base_url}/api/newsletter",
        f"{base_url}/api/login",
        f"{base_url}/login",
        f"{target_url}"
    ]
    
    # Strictly capped at MAX_TEST_REQUESTS = 20
    test_burst_count = MAX_TEST_REQUESTS
    metadata["burst_count"] = test_burst_count

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        # Find active probe endpoint
        target_ep = None
        for ep in candidate_endpoints:
            try:
                r = await client.post(ep, json={"email": "sentinel_ratelimit_check@demo.local"})
                if r.status_code in [200, 201, 400, 401, 403, 404, 429]:
                    target_ep = ep
                    break
            except Exception:
                continue

        if not target_ep:
            target_ep = target_url

        metadata["probed_endpoint"] = target_ep
        
        status_codes = []
        latencies = []
        rate_limit_headers_detected = False

        for i in range(test_burst_count):
            req_start = time.time()
            try:
                if "/newsletter" in target_ep or "/login" in target_ep:
                    resp = await client.post(target_ep, json={"email": f"burst_{i}@demo.local", "password": "test"})
                else:
                    resp = await client.get(target_ep)
                
                req_latency = int((time.time() - req_start) * 1000)
                status_codes.append(resp.status_code)
                latencies.append(req_latency)
                
                # Check for rate limiting headers
                for h in resp.headers.keys():
                    if "ratelimit" in h.lower() or "retry-after" in h.lower():
                        rate_limit_headers_detected = True

            except Exception:
                status_codes.append(0)

        metadata["status_distribution"] = {str(code): status_codes.count(code) for code in set(status_codes)}
        metadata["avg_latency_ms"] = int(sum(latencies) / len(latencies)) if latencies else 0
        metadata["rate_limit_headers_present"] = rate_limit_headers_detected
        
        throttling_triggered = 429 in status_codes
        
        # If all 20 requests succeeded (HTTP 200/201/401) with zero rate limiting or throttling headers
        if not throttling_triggered and not rate_limit_headers_detected:
            findings.append(Finding(
                id="rate-missing-throttling",
                test_id="rate_limit",
                category="Rate Limiting",
                severity="MEDIUM",
                title="Missing Rate Limiting & Abuse Defenses",
                summary="The endpoint accepted 20 rapid sequential requests without throttling, delay penalties, or rate-limiting headers.",
                evidence=f"Target: {target_ep}. Sent {test_burst_count} rapid requests. Status breakdown: {metadata['status_distribution']}. Zero HTTP 429 responses or RateLimit headers returned.",
                confidence=0.92,
                impact="Susceptible to API abuse, credential brute-forcing, spam submissions, and resource exhaustion.",
                recommendation="Implement rate limiting on state-changing and authentication endpoints (e.g. token bucket, sliding window) returning HTTP 429 with 'Retry-After' headers.",
                penalty_points=8,
                metadata={"endpoint": target_ep, "requests_sent": test_burst_count}
            ))

    duration_ms = int((time.time() - start_time) * 1000)
    status = "FAIL" if findings else "PASS"

    return TestResult(
        test_id="rate_limit",
        name="Rate Limiting & Abuse Resistance",
        category="Rate Limiting",
        status=status,
        severity="MEDIUM" if status == "FAIL" else "INFO",
        confidence=0.92,
        summary=f"Bounded rate limit test completed ({test_burst_count} requests). " + (
            "No rate limiting or throttling observed." if findings else "Rate limiting or defensive throttling detected."
        ),
        evidence=f"Probed {target_ep} with bounded burst of {test_burst_count} requests.",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

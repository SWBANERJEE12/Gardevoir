import time
import httpx
from urllib.parse import urlparse
from models.scan import TestResult, Finding
from security_policy import REQUEST_TIMEOUT_SECONDS

async def run_reconnaissance(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {}
    
    parsed = urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(base_url)
            metadata["status_code"] = resp.status_code
            metadata["server"] = resp.headers.get("server", "Hidden/Not Provided")
            metadata["powered_by"] = resp.headers.get("x-powered-by", "Hidden/Not Provided")
            metadata["content_type"] = resp.headers.get("content-type", "")
            
            # Check for robots.txt
            try:
                robots_resp = await client.get(f"{base_url}/robots.txt")
                metadata["robots_txt_found"] = (robots_resp.status_code == 200 and len(robots_resp.text) > 0)
            except Exception:
                metadata["robots_txt_found"] = False

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return TestResult(
            test_id="reconnaissance",
            name="Lightweight Reconnaissance",
            category="Reconnaissance",
            status="ERROR",
            severity="LOW",
            confidence=0.5,
            summary=f"Reconnaissance assessment encountered an error: {str(e)}",
            evidence=str(e),
            findings=[],
            duration_ms=duration_ms
        )

    duration_ms = int((time.time() - start_time) * 1000)
    summary = f"Lightweight reconnaissance completed. Disclosed server banner: {metadata.get('server')}"

    return TestResult(
        test_id="reconnaissance",
        name="Lightweight Reconnaissance",
        category="Reconnaissance",
        status="PASS",
        severity="INFO",
        confidence=0.98,
        summary=summary,
        evidence=f"Target: {base_url} (HTTP Status {metadata.get('status_code', 'N/A')})",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

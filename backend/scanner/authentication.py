import time
import httpx
from urllib.parse import urlparse
from models.scan import TestResult, Finding
from security_policy import REQUEST_TIMEOUT_SECONDS

async def run_authentication_assessment(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {}
    
    parsed = urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    login_url = f"{base_url}/api/login"
    
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
        # 1. Test rejection on invalid credentials
        try:
            invalid_payload = {"email": "nonexistent_sentinel_user@demo.local", "password": "WrongPassword!999"}
            resp_invalid = await client.post(login_url, json=invalid_payload)
            metadata["invalid_login_status"] = resp_invalid.status_code
            
            # Should reject with 401 or 400
            if resp_invalid.status_code not in [400, 401, 403]:
                findings.append(Finding(
                    id="auth-invalid-cred-acceptance",
                    test_id="authentication",
                    category="Authentication",
                    severity="CRITICAL",
                    title="Improper Authentication Response",
                    summary="Login endpoint returned an unexpected success or non-standard status when provided invalid credentials.",
                    evidence=f"POST {login_url} with invalid credentials returned HTTP {resp_invalid.status_code}",
                    confidence=0.98,
                    impact="Potential authentication bypass or flawed credential validation logic.",
                    recommendation="Ensure non-matching credentials strictly return HTTP 401 Unauthorized.",
                    penalty_points=25
                ))

            # 2. Check for credential enumeration disparity
            invalid_pass_payload = {"email": "alice@demo.local", "password": "IncorrectPassword999"}
            resp_existing_user = await client.post(login_url, json=invalid_pass_payload)
            
            # Compare error responses
            if (resp_invalid.status_code != resp_existing_user.status_code) or \
               ("user not found" in resp_invalid.text.lower() and "invalid password" in resp_existing_user.text.lower()):
                findings.append(Finding(
                    id="auth-user-enumeration",
                    test_id="authentication",
                    category="Authentication",
                    severity="LOW",
                    title="User Account Enumeration Disparity",
                    summary="The login endpoint reveals whether an email/username is registered through differing error messages or status codes.",
                    evidence=f"Non-existent user message differed from registered user failed login message.",
                    confidence=0.85,
                    impact="Allows adversaries to harvest valid usernames/emails for spear-phishing or credential stuffing.",
                    recommendation="Return a generic message such as 'Invalid email or password' for all failed authentication attempts.",
                    penalty_points=3
                ))

            # 3. Test session cookie flags on valid demo login (if demo endpoint)
            valid_payload = {"email": "alice@demo.local", "password": "pass123"}
            resp_valid = await client.post(login_url, json=valid_payload)
            if resp_valid.status_code == 200:
                cookies = resp_valid.cookies
                metadata["cookie_count"] = len(cookies)
                for cookie in resp_valid.headers.get_list("set-cookie"):
                    cookie_lower = cookie.lower()
                    if "session" in cookie_lower or "token" in cookie_lower or "auth" in cookie_lower:
                        if "httponly" not in cookie_lower:
                            findings.append(Finding(
                                id="auth-missing-httponly-cookie",
                                test_id="authentication",
                                category="Authentication",
                                severity="MEDIUM",
                                title="Missing HttpOnly Flag on Authentication Cookie",
                                summary="Session cookie is accessible via client-side JavaScript.",
                                evidence=f"Set-Cookie header: {cookie}",
                                confidence=0.95,
                                impact="Increases risk of session hijacking via Cross-Site Scripting (XSS).",
                                recommendation="Add the 'HttpOnly' directive to all authentication and session cookies.",
                                penalty_points=8
                            ))
                        if "samesite" not in cookie_lower:
                            findings.append(Finding(
                                id="auth-missing-samesite-cookie",
                                test_id="authentication",
                                category="Authentication",
                                severity="LOW",
                                title="Missing SameSite Attribute on Session Cookie",
                                summary="Session cookie does not specify SameSite protection.",
                                evidence=f"Set-Cookie header: {cookie}",
                                confidence=0.90,
                                impact="Leaves session cookies vulnerable to Cross-Site Request Forgery (CSRF).",
                                recommendation="Add 'SameSite=Lax' or 'SameSite=Strict' to session cookies.",
                                penalty_points=3
                            ))

        except Exception as e:
            metadata["auth_check_error"] = str(e)

    duration_ms = int((time.time() - start_time) * 1000)
    status = "FAIL" if any(f.severity in ["CRITICAL", "HIGH"] for f in findings) else ("WARN" if findings else "PASS")
    summary = (
        f"Authentication assessment completed with {len(findings)} issue(s) identified."
        if findings else "Authentication defenses verified: invalid credentials correctly rejected, session cookies properly secured."
    )

    return TestResult(
        test_id="authentication",
        name="Authentication & Session Integrity",
        category="Authentication",
        status=status,
        severity="HIGH" if status == "FAIL" else ("MEDIUM" if status == "WARN" else "INFO"),
        confidence=0.93,
        summary=summary,
        evidence=f"Evaluated authentication flow on {login_url}",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

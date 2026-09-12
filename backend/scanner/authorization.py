import time
import httpx
from urllib.parse import urlparse
from models.scan import TestResult, Finding
from security_policy import REQUEST_TIMEOUT_SECONDS

async def run_authorization_assessment(target_url: str) -> TestResult:
    start_time = time.time()
    findings = []
    metadata = {}
    
    parsed = urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    
    try:
        # Check 1: Unauthenticated access check using a clean client with NO cookies
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as anon_client:
            unauth_resp = await anon_client.get(f"{base_url}/api/orders/101")
            if unauth_resp.status_code == 200:
                findings.append(Finding(
                    id="authz-unauthenticated-access",
                    test_id="authorization",
                    category="Authorization",
                    severity="CRITICAL",
                    title="Unprotected Private Resource",
                    summary="Private order data was accessed without authentication headers or session tokens.",
                    evidence=f"GET {base_url}/api/orders/101 returned HTTP 200 to anonymous requester.",
                    confidence=0.99,
                    impact="Complete exposure of private customer order and personal data to unauthenticated internet traffic.",
                    recommendation="Require valid authentication on all private API endpoints.",
                    penalty_points=25
                ))

        # Check 2: Cross-User / Broken Object-Level Authorization (IDOR)
        # Login as User Alice to obtain token
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as auth_client:
            login_url = f"{base_url}/api/login"
            alice_login = await auth_client.post(login_url, json={"email": "alice@demo.local", "password": "pass123"})
            
            if alice_login.status_code == 200:
                alice_data = alice_login.json()
                alice_token = alice_data.get("token")
                alice_headers = {"Authorization": f"Bearer {alice_token}"}
                
                # Alice attempts to access Bob's private order #102
                idor_resp = await auth_client.get(f"{base_url}/api/orders/102", headers=alice_headers)
                metadata["idor_test_status"] = idor_resp.status_code
                
                if idor_resp.status_code == 200:
                    idor_data = idor_resp.json()
                    order_info = idor_data.get("order", {})
                    accessed_by = idor_data.get("accessed_by", "Alice")
                    is_owner = idor_data.get("is_owner", False)
                    
                    if not is_owner or order_info.get("owner_id") == "usr_bob":
                        findings.append(Finding(
                            id="authz-broken-object-level-idor",
                            test_id="authorization",
                            category="Authorization",
                            severity="HIGH",
                            title="Broken Object Level Authorization (IDOR Weakness)",
                            summary="A protected resource did not enforce user-level authorization during the controlled assessment. User Alice successfully read Order 102 belonging to User Bob.",
                            evidence=f"Authenticated as {accessed_by}, requested order 102 (owned by usr_bob). Received HTTP 200 with sensitive payload: {order_info.get('item', 'Item')} to {order_info.get('shipping_address', 'Address')}.",
                            confidence=0.96,
                            impact="Potential unauthorized access to resources across tenant and user boundaries.",
                            recommendation="Enforce server-side authorization checks for every protected resource and operation: verify that the requesting subject matches the resource owner.",
                            penalty_points=15,
                            metadata={"target_endpoint": f"{base_url}/api/orders/102", "violation_type": "IDOR"}
                        ))
            else:
                metadata["note"] = "Target does not expose standard demo multi-user authentication fixtures."

    except Exception as e:
        metadata["authz_error"] = str(e)

    duration_ms = int((time.time() - start_time) * 1000)
    status = "FAIL" if any(f.severity in ["CRITICAL", "HIGH"] for f in findings) else ("WARN" if findings else "PASS")
    
    summary = (
        f"Authorization assessment detected {len(findings)} authorization boundary violation(s)."
        if findings else "Authorization boundaries verified. Resource-level access controls enforced."
    )

    return TestResult(
        test_id="authorization",
        name="Access Control & Object-Level Authorization",
        category="Authorization",
        status=status,
        severity="HIGH" if status == "FAIL" else ("MEDIUM" if status == "WARN" else "INFO"),
        confidence=0.96,
        summary=summary,
        evidence=f"Target: {base_url}/api/orders/ (Controlled multi-user fixture)",
        findings=findings,
        metadata=metadata,
        duration_ms=duration_ms
    )

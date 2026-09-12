# HackBattle Shop - Demo Target Vulnerability & Control Documentation

This document describes the intentional security controls and weaknesses embedded in the **HackBattle Shop** testbed (`http://localhost:5001`). It provides the ground truth for evaluating Sentinel's detection and adaptive reasoning capabilities.

---

## 1. Intentional Weaknesses (Expected FAIL / WARN)

### 🔴 Broken Object-Level Authorization (IDOR) - Status: FAIL
- **Endpoint**: `GET /api/orders/<order_id>`
- **Behavior**: Requires valid user authentication, but fails to check resource ownership. User Alice (`token_alice_sec99`) is permitted to view Bob's order (`102`) containing sensitive shipping details.
- **Expected Severity**: `HIGH`
- **Expected Penalty**: -15 points

### 🔴 Missing Rate Limiting / Abuse Protections - Status: FAIL
- **Endpoint**: `POST /api/newsletter`
- **Behavior**: Does not return `RateLimit-*` or `Retry-After` headers and processes 20 rapid bursts with HTTP 200 without throttling.
- **Expected Severity**: `MEDIUM`
- **Expected Penalty**: -8 points

### 🟡 Missing Content Security Policy & Strict-Transport-Security - Status: WARN
- **Behavior**: Server provides `X-Frame-Options` and `X-Content-Type-Options`, but omits `Content-Security-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`.
- **Expected Severity**: `LOW`
- **Expected Penalty**: -3 points

### 🟡 Input Reflection - Status: WARN
- **Endpoint**: `GET /api/search?q=<probe>`
- **Behavior**: Safe reflection of special characters without strict schema sanitization.
- **Expected Severity**: `LOW`
- **Expected Penalty**: -2 points

---

## 2. Strong Defenses (Expected PASS)

### 🟢 Session Cookie Security & Credential Handling - Status: PASS
- **Endpoint**: `POST /api/login`
- **Behavior**: 
  - Session cookie is marked with `HttpOnly=True` and `SameSite=Lax`.
  - Rejection message is uniform on invalid credentials to prevent username enumeration.

### 🟢 Server Fingerprint & Basic Transport - Status: PASS
- Standard response handling and error isolation.

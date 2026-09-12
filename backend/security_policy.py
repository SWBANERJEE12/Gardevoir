"""
Strict Security Policy and Boundaries for Sentinel
Enforces non-destructive, bounded, allowlisted security assessments.
"""
from urllib.parse import urlparse

# Strict allowlist of implemented assessment IDs
ALLOWLISTED_TEST_IDS = [
    "reconnaissance",
    "tls",
    "security_headers",
    "input_validation",
    "authentication",
    "authorization",
    "rate_limit"
]

MAX_TEST_REQUESTS = 20
MAX_AI_ITERATIONS = 5
REQUEST_TIMEOUT_SECONDS = 6.0

def validate_target_url(url: str) -> tuple[bool, str]:
    """Validates that a URL is well-formed and safe for assessment."""
    if not url:
        return False, "Target URL is required."
    
    parsed = urlparse(url)
    if parsed.scheme not in ["http", "https"]:
        return False, "Only HTTP and HTTPS URLs are supported."
    
    if not parsed.netloc:
        return False, "Target URL missing hostname or host is invalid."
        
    return True, "Valid target URL."

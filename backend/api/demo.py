from fastapi import APIRouter
from config import settings

router = APIRouter(prefix="/api/demo", tags=["Demo"])

@router.get("/target")
async def get_demo_target_info():
    return {
        "name": "HackBattle Shop",
        "url": settings.DEMO_TARGET_BASE_URL,
        "description": "Local demonstration e-commerce API testbed with seeded intentional vulnerabilities.",
        "scenarios": [
            {
                "category": "Authorization",
                "test": "Broken Object-Level Authorization (IDOR)",
                "expected": "FAIL (Alice accessing Bob's order #102)"
            },
            {
                "category": "Rate Limiting",
                "test": "Missing Throttling on Newsletter Subscription",
                "expected": "FAIL / WARN (20 rapid requests without 429)"
            },
            {
                "category": "Security Headers",
                "test": "Missing Content-Security-Policy & HSTS",
                "expected": "WARN"
            },
            {
                "category": "Input Validation",
                "test": "Special Character Echo Reflection",
                "expected": "WARN"
            },
            {
                "category": "Authentication",
                "test": "HttpOnly Session Cookies & Rejection Disparity",
                "expected": "PASS"
            }
        ]
    }

from models.scan import TestResult, ScoringReport, CategoryScore, PenaltyItem, Finding

CATEGORY_WEIGHTS = {
    "reconnaissance": {"name": "Reconnaissance", "weight": 10},
    "tls": {"name": "TLS / Transport", "weight": 10},
    "security_headers": {"name": "Security Headers", "weight": 10},
    "input_validation": {"name": "Input Validation", "weight": 20},
    "authentication": {"name": "Authentication", "weight": 15},
    "authorization": {"name": "Authorization", "weight": 20},
    "rate_limit": {"name": "Rate Limiting", "weight": 15},
}

SEVERITY_PENALTIES = {
    "CRITICAL": 25,
    "HIGH": 15,
    "MEDIUM": 8,
    "LOW": 3,
    "INFO": 0
}

def calculate_score(test_results: dict[str, TestResult], all_findings: list[Finding]) -> ScoringReport:
    """
    Computes a deterministic security score (0 - 100) based on category weights,
    test results, and deduplicated finding penalties.
    """
    passed_count = 0
    warn_count = 0
    fail_count = 0
    inconclusive_count = 0

    category_scores: dict[str, CategoryScore] = {}
    penalties: list[PenaltyItem] = []
    
    total_penalty_deduction = 0

    # Calculate penalties from findings
    seen_finding_ids = set()
    for finding in all_findings:
        if finding.id in seen_finding_ids:
            continue
        seen_finding_ids.add(finding.id)
        
        penalty_pts = finding.penalty_points or SEVERITY_PENALTIES.get(finding.severity, 0)
        if penalty_pts > 0:
            total_penalty_deduction += penalty_pts
            penalties.append(PenaltyItem(
                category=finding.category,
                title=finding.title,
                severity=finding.severity,
                points_lost=penalty_pts,
                reason=finding.summary
            ))

    # Evaluate each standard category
    for test_id, meta in CATEGORY_WEIGHTS.items():
        cat_name = meta["name"]
        cat_weight = meta["weight"]
        
        result = test_results.get(test_id)
        if not result:
            category_scores[test_id] = CategoryScore(
                category=cat_name,
                score=100,
                weight=cat_weight,
                status="NOT_RUN"
            )
            continue

        if result.status == "PASS":
            passed_count += 1
            cat_score = 100
        elif result.status == "WARN":
            warn_count += 1
            cat_score = 75
        elif result.status == "FAIL":
            fail_count += 1
            # Adjust category score based on severity of findings in this category
            has_crit = any(f.severity == "CRITICAL" for f in result.findings)
            has_high = any(f.severity == "HIGH" for f in result.findings)
            cat_score = 30 if has_crit else (40 if has_high else 60)
        else:
            inconclusive_count += 1
            cat_score = 80

        category_scores[test_id] = CategoryScore(
            category=cat_name,
            score=cat_score,
            weight=cat_weight,
            status=result.status
        )

    # Base score 100 minus total penalties, clamped between 0 and 100
    overall_score = max(0, min(100, 100 - total_penalty_deduction))

    if overall_score >= 90:
        risk_level = "SECURE"
    elif overall_score >= 75:
        risk_level = "LOW RISK"
    elif overall_score >= 50:
        risk_level = "MODERATE RISK"
    elif overall_score >= 30:
        risk_level = "HIGH RISK"
    else:
        risk_level = "CRITICAL RISK"

    return ScoringReport(
        overall_score=overall_score,
        risk_level=risk_level,
        passed_count=passed_count,
        warn_count=warn_count,
        fail_count=fail_count,
        inconclusive_count=inconclusive_count,
        category_scores=category_scores,
        penalties=penalties,
        total_points_lost=total_penalty_deduction
    )

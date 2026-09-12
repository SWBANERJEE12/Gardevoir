from models.scan import TestResult, ScoringReport, CategoryScore, PenaltyItem, Finding, RegionStatus

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

REGION_COPY = {
    "reconnaissance": "How much of your application surface is visible to an attacker.",
    "tls": "Encryption and transport integrity between users and your site.",
    "security_headers": "Browser-enforced protections such as framing, content types, and referrer policy.",
    "input_validation": "Whether user input can be used to inject or distort application behavior.",
    "authentication": "Sign-in, session, and credential handling.",
    "authorization": "Whether users can reach data or actions they should not.",
    "rate_limit": "Resistance to brute force, flooding, and automated abuse.",
}


def classify_overall(score: int) -> tuple[str, str, str, bool]:
    if score >= 100:
        return "PERFECT SCORE", "perfect", "Every assessed region passed with no penalties.", False
    if score >= 90:
        return "NEAR PERFECT SCORE", "near_perfect", "Almost fully secured. A few small issues remain.", False
    if score >= 70:
        return "WELL SECURED", "well_secured", "Strong overall posture with some regions still needing work.", False
    if score >= 55:
        return "MODERATELY SECURE", "moderately_secure", "Usable defenses, but several regions are exposed.", False
    if score >= 30:
        return "LOW SCORE", "low_score", "Multiple regions are weak. Prioritize the failing areas below.", False
    return "NOT SECURED", "not_secured", "Warning: the application is not adequately protected.", True


def classify_region(cat_score: int, status: str) -> tuple[str, str]:
    if status == "PASS" and cat_score >= 100:
        return "perfectly_secure", "This region is perfectly secure."
    if status == "PASS" or cat_score >= 80:
        return "secure", "This region is in good shape."
    if status == "WARN" or cat_score >= 55:
        return "attention", "This region needs attention."
    if status == "NOT_RUN":
        return "attention", "This region was not evaluated in this pass."
    return "vulnerable", "This region is vulnerable."


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
    regions: list[RegionStatus] = []

    total_penalty_deduction = 0

    seen_finding_ids = set()
    findings_by_category: dict[str, list[str]] = {}
    for finding in all_findings:
        findings_by_category.setdefault(finding.category, []).append(finding.title)
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

    for test_id, meta in CATEGORY_WEIGHTS.items():
        cat_name = meta["name"]
        cat_weight = meta["weight"]

        result = test_results.get(test_id)
        if not result:
            verdict, headline = classify_region(100, "NOT_RUN")
            category_scores[test_id] = CategoryScore(
                category=cat_name,
                score=100,
                weight=cat_weight,
                status="NOT_RUN",
                verdict=verdict,
                detail=headline,
            )
            regions.append(RegionStatus(
                id=test_id,
                name=cat_name,
                score=100,
                status="NOT_RUN",
                verdict=verdict,
                headline=headline,
                detail=REGION_COPY[test_id],
                finding_titles=[],
            ))
            continue

        if result.status == "PASS":
            passed_count += 1
            cat_score = 100
        elif result.status == "WARN":
            warn_count += 1
            cat_score = 75
        elif result.status == "FAIL":
            fail_count += 1
            has_crit = any(f.severity == "CRITICAL" for f in result.findings)
            has_high = any(f.severity == "HIGH" for f in result.findings)
            cat_score = 30 if has_crit else (40 if has_high else 60)
        else:
            inconclusive_count += 1
            cat_score = 80

        verdict, headline = classify_region(cat_score, result.status)
        category_scores[test_id] = CategoryScore(
            category=cat_name,
            score=cat_score,
            weight=cat_weight,
            status=result.status,
            verdict=verdict,
            detail=headline,
        )
        titles = [f.title for f in result.findings] or findings_by_category.get(cat_name, [])
        regions.append(RegionStatus(
            id=test_id,
            name=cat_name,
            score=cat_score,
            status=result.status,
            verdict=verdict,
            headline=headline,
            detail=result.summary or REGION_COPY[test_id],
            finding_titles=titles,
        ))

    overall_score = max(0, min(100, 100 - total_penalty_deduction))
    score_label, score_band, _, warning = classify_overall(overall_score)

    secure_regions = [r for r in regions if r.verdict in ("perfectly_secure", "secure")]
    attention_regions = [r for r in regions if r.verdict == "attention"]
    vulnerable_regions = [r for r in regions if r.verdict == "vulnerable"]

    return ScoringReport(
        overall_score=overall_score,
        risk_level=score_label,
        score_label=score_label,
        score_band=score_band,
        score_warning=warning,
        passed_count=passed_count,
        warn_count=warn_count,
        fail_count=fail_count,
        inconclusive_count=inconclusive_count,
        category_scores=category_scores,
        penalties=penalties,
        total_points_lost=total_penalty_deduction,
        secure_regions=secure_regions,
        vulnerable_regions=vulnerable_regions,
        attention_regions=attention_regions,
    )

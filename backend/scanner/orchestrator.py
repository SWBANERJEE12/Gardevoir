import asyncio
import uuid
from datetime import datetime
from typing import Optional

from models.scan import (
    ScanReport,
    TestResult,
    Finding,
    TimelineEvent,
    ScoringReport
)
from models.ai import AIObservationPayload
from security_policy import ALLOWLISTED_TEST_IDS, MAX_AI_ITERATIONS
from scanner.recon import run_reconnaissance
from scanner.tls import run_tls_assessment
from scanner.headers import run_security_headers_assessment
from scanner.input_validation import run_input_validation_assessment
from scanner.authentication import run_authentication_assessment
from scanner.authorization import run_authorization_assessment
from scanner.rate_limit import run_rate_limit_assessment
from ai.analyst import ai_analyst
from scoring.scorer import calculate_score

# In-memory scan store (sufficient and fast for hackathon runtime)
SCANS_STORE: dict[str, ScanReport] = {}

TEST_RUNNERS = {
    "reconnaissance": run_reconnaissance,
    "tls": run_tls_assessment,
    "security_headers": run_security_headers_assessment,
    "input_validation": run_input_validation_assessment,
    "authentication": run_authentication_assessment,
    "authorization": run_authorization_assessment,
    "rate_limit": run_rate_limit_assessment,
}

def create_scan(target_url: str) -> ScanReport:
    scan_id = f"scan_{uuid.uuid4().hex[:10]}"
    report = ScanReport(
        scan_id=scan_id,
        target_url=target_url,
        status="PENDING",
        created_at=datetime.utcnow().isoformat(),
        current_step="Scan queued",
        timeline=[
            TimelineEvent(
                timestamp=datetime.utcnow().strftime("%H:%M:%S"),
                event_type="SCAN_START",
                message=f"Initialized bounded security assessment against {target_url}"
            )
        ]
    )
    SCANS_STORE[scan_id] = report
    return report

def get_scan(scan_id: str) -> Optional[ScanReport]:
    return SCANS_STORE.get(scan_id)

async def execute_scan_pipeline(scan_id: str):
    scan = SCANS_STORE.get(scan_id)
    if not scan:
        return

    scan.status = "RUNNING"
    target_url = scan.target_url

    async def run_single_test(test_id: str) -> TestResult:
        scan.current_step = f"Executing test: {test_id}"
        scan.timeline.append(TimelineEvent(
            timestamp=datetime.utcnow().strftime("%H:%M:%S"),
            event_type="TEST_START",
            message=f"Beginning {test_id} assessment",
            test_id=test_id
        ))
        
        runner = TEST_RUNNERS.get(test_id)
        if not runner:
            res = TestResult(
                test_id=test_id,
                name=test_id,
                category="Unknown",
                status="ERROR",
                summary="Runner not found",
                evidence="N/A"
            )
        else:
            res = await runner(target_url)

        scan.test_results[test_id] = res
        scan.tests_completed.append(test_id)
        
        # Merge findings
        for f in res.findings:
            if not any(existing.id == f.id for existing in scan.findings):
                scan.findings.append(f)

        scan.timeline.append(TimelineEvent(
            timestamp=datetime.utcnow().strftime("%H:%M:%S"),
            event_type="TEST_COMPLETE",
            message=f"{res.name} completed with status: {res.status}",
            details={"findings_count": len(res.findings), "status": res.status},
            test_id=test_id
        ))
        return res

    try:
        # 1. BASELINE ASSESSMENTS: Reconnaissance, TLS, Security Headers
        baseline_tests = ["reconnaissance", "tls", "security_headers"]
        for test_id in baseline_tests:
            await run_single_test(test_id)
            await asyncio.sleep(0.3) # Subtle pacing for smooth live UI feedback

        # 2. ADAPTIVE AI LOOP: OBSERVE -> REASON -> SELECT -> TEST -> LEARN -> REPEAT
        ai_iterations = 0
        while ai_iterations < MAX_AI_ITERATIONS:
            ai_iterations += 1
            
            # Prepare observation state
            observations_map = {
                t_id: res.summary for t_id, res in scan.test_results.items()
            }
            payload = AIObservationPayload(
                target=target_url,
                completed_tests=scan.tests_completed,
                observations=observations_map,
                findings=[f.model_dump() for f in scan.findings],
                available_tests=ALLOWLISTED_TEST_IDS
            )

            scan.current_step = "AI Security Analyst observing results and selecting next assessment"
            scan.timeline.append(TimelineEvent(
                timestamp=datetime.utcnow().strftime("%H:%M:%S"),
                event_type="AI_REASONING",
                message="AI Security Analyst synthesizing baseline telemetry and target posture..."
            ))

            decision, analyst_mode = await ai_analyst.decide_next_assessment(payload)

            if decision.should_stop or not decision.next_test or decision.next_test in scan.tests_completed:
                scan.timeline.append(TimelineEvent(
                    timestamp=datetime.utcnow().strftime("%H:%M:%S"),
                    event_type="AI_DECISION",
                    message=f"AI concluded assessment loop: {decision.stop_reason or decision.reason}",
                    details={"analyst_mode": analyst_mode, "confidence": decision.confidence}
                ))
                break

            # Log AI decision
            scan.timeline.append(TimelineEvent(
                timestamp=datetime.utcnow().strftime("%H:%M:%S"),
                event_type="AI_DECISION",
                message=f"AI selected [{decision.next_test.upper()}]: {decision.reason}",
                details={
                    "next_test": decision.next_test,
                    "reason": decision.reason,
                    "priority": decision.priority,
                    "confidence": decision.confidence,
                    "analyst_mode": analyst_mode
                },
                test_id=decision.next_test
            ))

            # Execute selected test
            await run_single_test(decision.next_test)
            await asyncio.sleep(0.4)

        # 3. COMPLETE REMAINING CORE TESTS IF ANY REMAIN UNTESTED
        remaining_core = [t for t in ["input_validation", "authentication", "authorization", "rate_limit"] if t not in scan.tests_completed]
        for t in remaining_core:
            await run_single_test(t)
            await asyncio.sleep(0.2)

        # 4. FINAL DETERMINISTIC SCORING
        scan.scoring = calculate_score(scan.test_results, scan.findings)

        # 5. AI EXECUTIVE SUMMARY
        scan.current_step = "Generating final AI security summary & remediation report"
        scan.ai_summary = await ai_analyst.generate_summary_report(scan.findings)

        scan.status = "COMPLETED"
        scan.completed_at = datetime.utcnow().isoformat()
        scan.current_step = "Assessment Complete"
        scan.timeline.append(TimelineEvent(
            timestamp=datetime.utcnow().strftime("%H:%M:%S"),
            event_type="SCAN_COMPLETE",
            message=f"Assessment complete. Security Score: {scan.scoring.overall_score}/100 ({scan.scoring.risk_level})"
        ))

    except Exception as e:
        scan.status = "FAILED"
        scan.current_step = f"Scan failed: {str(e)}"
        scan.timeline.append(TimelineEvent(
            timestamp=datetime.utcnow().strftime("%H:%M:%S"),
            event_type="ERROR",
            message=f"Scan execution error: {str(e)}"
        ))

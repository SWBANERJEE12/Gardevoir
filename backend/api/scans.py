import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.scan import ScanRequest, ScanReport, Finding
from security_policy import validate_target_url
from scanner.orchestrator import create_scan, get_scan, execute_scan_pipeline

router = APIRouter(prefix="/api/scans", tags=["Scans"])

@router.post("", response_model=ScanReport)
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    is_valid, err_msg = validate_target_url(request.target_url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    if not request.authorized:
        raise HTTPException(
            status_code=403,
            detail="Authorization required. You must confirm you own or are explicitly authorized to test this target."
        )

    scan = create_scan(request.target_url)
    background_tasks.add_task(execute_scan_pipeline, scan.scan_id)
    return scan

@router.get("/{scan_id}", response_model=ScanReport)
async def fetch_scan(scan_id: str):
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.get("/{scan_id}/findings", response_model=list[Finding])
async def fetch_scan_findings(scan_id: str):
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan.findings

@router.get("/{scan_id}/results")
async def fetch_scan_results(scan_id: str):
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "scan_id": scan.scan_id,
        "status": scan.status,
        "scoring": scan.scoring,
        "test_results": scan.test_results,
        "ai_summary": scan.ai_summary
    }

import { ScanReport, Finding, DemoTargetInfo } from "./types";
import { authHeaders } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function startScan(targetUrl: string, authorized: boolean): Promise<ScanReport> {
  const res = await fetch(`${API_BASE_URL}/scans`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      target_url: targetUrl,
      authorized: authorized,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Failed to initiate scan (${res.status})`);
  }

  return res.json();
}

export async function getScan(scanId: string): Promise<ScanReport> {
  const res = await fetch(`${API_BASE_URL}/scans/${scanId}`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch scan (${res.status})`);
  }

  return res.json();
}

export async function getDemoTargetInfo(): Promise<DemoTargetInfo> {
  const res = await fetch(`${API_BASE_URL}/demo/target`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load demo target information");
  }

  return res.json();
}

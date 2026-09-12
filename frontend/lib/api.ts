import { ScanReport, DemoTargetInfo } from "./types";
import { authHeaders, loadAiMemory } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export async function startScan(targetUrl: string, authorized: boolean): Promise<ScanReport> {
  const res = await fetch(`${API_BASE_URL}/scans`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({
      target_url: targetUrl,
      authorized: authorized,
      memory: loadAiMemory(),
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
    credentials: "include",
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

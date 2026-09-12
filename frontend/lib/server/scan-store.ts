import type { ScanReport } from "../types";

const g = globalThis as typeof globalThis & { __gardevoirScans?: Map<string, ScanReport> };

function scans() {
  if (!g.__gardevoirScans) g.__gardevoirScans = new Map();
  return g.__gardevoirScans;
}

export function saveScan(scan: ScanReport) {
  scans().set(scan.scan_id, scan);
}

export function readScan(id: string) {
  return scans().get(id) || null;
}

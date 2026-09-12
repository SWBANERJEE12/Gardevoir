"use client";

import React from "react";
import { ScanReport } from "../lib/types";

interface LiveScanViewProps {
  scan: ScanReport;
}

const ALL_ASSESSMENTS = [
  { id: "reconnaissance", name: "Reconnaissance", category: "Recon" },
  { id: "tls", name: "Transport Layer Security", category: "TLS" },
  { id: "security_headers", name: "Security Headers", category: "Headers" },
  { id: "authorization", name: "Access & Authorization", category: "Authz" },
  { id: "rate_limit", name: "Rate Limiting Defenses", category: "Abuse" },
  { id: "input_validation", name: "Input Validation", category: "Input" },
  { id: "authentication", name: "Authentication Integrity", category: "Auth" }
];

export const LiveScanView: React.FC<LiveScanViewProps> = ({ scan }) => {
  const latestAiEvent = [...scan.timeline]
    .reverse()
    .find((e) => e.event_type === "AI_DECISION" || e.event_type === "AI_REASONING");
  const analystMode = latestAiEvent?.details?.analyst_mode || scan.ai_summary?.analyst_mode || "DEMO MODE";

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <div className="lg lg-static p-6" style={{ borderRadius: 24 }}>
        <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>In progress</p>
        <h2 className="mt-2 break-all text-2xl font-black">{scan.target_url}</h2>
        <p className="mt-1 text-sm text-white/50">{scan.current_step}</p>
        <p className="mt-4 uppercase text-white/35" style={{ fontSize: "0.62rem", letterSpacing: "0.2em" }}>Analyst · {analystMode}</p>
      </div>

      <div className="lg lg-static p-6" style={{ borderRadius: 24 }}>
        <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Adaptive loop</p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {["Observe", "Reason", "Select", "Test", "Learn", "Repeat"].map((step) => (
            <div key={step} className="lg lg-static py-3 text-center text-sm" style={{ borderRadius: 12 }}>{step}</div>
          ))}
        </div>
        <p className="mt-6 leading-relaxed text-white/75">
          {latestAiEvent?.message || "Initializing baseline reconnaissance and secure transport telemetry..."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ALL_ASSESSMENTS.map((assessment) => {
          const isCompleted = scan.tests_completed.includes(assessment.id);
          const result = scan.test_results[assessment.id];
          const isCurrentlyRunning = !isCompleted && scan.current_step.toLowerCase().includes(assessment.id);
          return (
            <div key={assessment.id} className="lg lg-static p-4" style={{ borderRadius: 16 }}>
              <div className="flex items-center justify-between">
                <span className="uppercase text-white/35" style={{ fontSize: "0.6rem", letterSpacing: "0.16em" }}>{assessment.category}</span>
                <span className="uppercase text-white/50" style={{ fontSize: "0.6rem", letterSpacing: "0.14em" }}>
                  {isCompleted ? result?.status : isCurrentlyRunning ? "Running" : "Pending"}
                </span>
              </div>
              <p className="mt-2 font-semibold">{assessment.name}</p>
              {result && <p className="mt-2 line-clamp-2 text-sm text-white/50">{result.summary}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { Finding } from "../lib/types";

interface FindingsTableProps {
  findings: Finding[];
}

export const FindingsTable: React.FC<FindingsTableProps> = ({ findings }) => {
  const [expandedId, setExpandedId] = useState<string | null>(findings[0]?.id || null);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const filteredFindings = findings.filter((f) => filterSeverity === "ALL" || f.severity === filterSeverity);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="lg lg-static flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderRadius: 24 }}>
        <div>
          <h2 className="font-black text-3xl">Findings</h2>
          <p className="mt-1 text-sm text-white/45">{filteredFindings.length} of {findings.length}</p>
        </div>
        <div className="flex gap-2">
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className="lg px-3 py-1.5 uppercase"
              style={{
                fontSize: "0.62rem",
                letterSpacing: "0.16em",
                borderRadius: 999,
                background: filterSeverity === sev ? "rgba(255,255,255,0.18)" : undefined,
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="lg lg-static p-8 text-center text-sm text-white/45" style={{ borderRadius: 20 }}>No findings match the selected filter.</div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;
            return (
              <div key={finding.id} className="lg lg-static overflow-hidden" style={{ borderRadius: 20 }}>
                <button onClick={() => setExpandedId(isExpanded ? null : finding.id)} className="w-full p-5 text-left">
                  <p className="uppercase text-white/35" style={{ fontSize: "0.6rem", letterSpacing: "0.16em" }}>
                    {finding.category} · {finding.severity}
                    {finding.penalty_points > 0 ? ` · −${finding.penalty_points}` : ""}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{finding.title}</h3>
                </button>
                {isExpanded && (
                  <div className="space-y-4 border-t border-white/10 px-5 pb-6 pt-4 text-sm">
                    <p className="leading-relaxed text-white/70">{finding.summary}</p>
                    <div>
                      <p className="uppercase text-white/40" style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}>Evidence</p>
                      <p className="mt-2 break-all rounded-xl bg-black/30 p-3 text-xs text-white/70">{finding.evidence}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="lg lg-static p-4" style={{ borderRadius: 14 }}>
                        <p className="uppercase text-white/40" style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}>Impact</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/65">{finding.impact}</p>
                      </div>
                      <div className="lg lg-static p-4" style={{ borderRadius: 14 }}>
                        <p className="uppercase text-white/40" style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}>Remediation</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/65">{finding.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

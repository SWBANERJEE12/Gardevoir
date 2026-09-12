"use client";

import React from "react";
import { ScanReport } from "../lib/types";
import { scoreMeta } from "../lib/score";
import { RegionMap } from "./RegionMap";

interface ResultsDashboardProps {
  scan: ScanReport;
  onSelectTab: (tab: "findings" | "why_points" | "timeline") => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ scan, onSelectTab }) => {
  const scoring = scan.scoring;
  const aiSummary = scan.ai_summary;
  if (!scoring) return null;
  const meta = scoreMeta(scoring.overall_score, scoring);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {meta.warning && (
        <div className="lg lg-static px-6 py-5 text-center" style={{ borderRadius: 20, borderColor: "rgba(255,80,80,0.35)" }}>
          <p className="uppercase text-white/50" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Warning</p>
          <p className="mt-2 font-black text-3xl">NOT SECURED</p>
          <p className="mt-2 text-sm text-white/55">This site is not adequately protected. Start with the vulnerable regions below.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg lg-static p-8 text-center lg:col-span-5" style={{ borderRadius: 24 }}>
          <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Overall score</p>
          <div className="mt-4 flex items-baseline justify-center gap-1">
            <span className="font-black" style={{ fontSize: "4.5rem", letterSpacing: "-0.04em", lineHeight: 1 }}>{scoring.overall_score}</span>
            <span className="text-white/35">/100</span>
          </div>
          <p className="mt-2 font-semibold uppercase" style={{ letterSpacing: "0.16em", fontSize: "0.78rem" }}>{meta.label}</p>
          <div className="mt-8 grid grid-cols-4 gap-2 border-t border-white/10 pt-6">
            {[
              ["Pass", scoring.passed_count],
              ["Warn", scoring.warn_count],
              ["Fail", scoring.fail_count],
              ["Other", scoring.inconclusive_count],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="text-xl font-semibold">{value}</div>
                <div className="uppercase text-white/35" style={{ fontSize: "0.6rem", letterSpacing: "0.16em" }}>{label}</div>
              </div>
            ))}
          </div>
          {scoring.total_points_lost > 0 && (
            <button
              onClick={() => onSelectTab("why_points")}
              className="lg mt-6 w-full py-3 text-white font-semibold uppercase"
              style={{ letterSpacing: "0.14em", fontSize: "0.7rem", borderRadius: 14 }}
            >
              Why {scoring.total_points_lost} points were lost
            </button>
          )}
        </div>

        <div className="lg lg-static p-6 lg:col-span-7" style={{ borderRadius: 24 }}>
          <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Region health</p>
          <div className="mt-5 space-y-4">
            {Object.entries(scoring.category_scores).map(([key, cat]) => (
              <div key={key}>
                <div className="flex justify-between text-sm">
                  <span>{cat.category}</span>
                  <span className="text-white/50">{cat.score} · {cat.detail || cat.status}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(4, cat.score)}%`,
                      background: cat.score >= 80 ? "rgba(180,220,255,0.9)" : cat.score >= 55 ? "rgba(255,210,140,0.85)" : "rgba(255,120,120,0.85)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RegionMap
        secure={scoring.secure_regions}
        attention={scoring.attention_regions}
        vulnerable={scoring.vulnerable_regions}
      />

      {aiSummary && (
        <div className="lg lg-static p-8" style={{ borderRadius: 24 }}>
          <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>
            Analyst · {aiSummary.analyst_mode}
          </p>
          <p className="mt-4 text-lg leading-relaxed text-white/80">“{aiSummary.executive_summary}”</p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="lg lg-static p-4" style={{ borderRadius: 16 }}>
              <p className="uppercase text-white/45" style={{ fontSize: "0.62rem", letterSpacing: "0.2em" }}>Secure</p>
              <ul className="mt-3 space-y-2 text-sm text-white/65">
                {aiSummary.strongest_defenses.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="lg lg-static p-4" style={{ borderRadius: 16 }}>
              <p className="uppercase text-white/45" style={{ fontSize: "0.62rem", letterSpacing: "0.2em" }}>Not secure</p>
              <ul className="mt-3 space-y-2 text-sm text-white/65">
                {aiSummary.primary_weaknesses.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="lg lg-static p-4" style={{ borderRadius: 16 }}>
              <p className="uppercase text-white/45" style={{ fontSize: "0.62rem", letterSpacing: "0.2em" }}>Next</p>
              <ul className="mt-3 space-y-2 text-sm text-white/65">
                {aiSummary.remediation_priorities.map((item, idx) => <li key={item}>{idx + 1}. {item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

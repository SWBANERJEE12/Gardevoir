"use client";

import React from "react";
import { PenaltyItem } from "../lib/types";

interface WhyPointsLostProps {
  penalties: PenaltyItem[];
  totalPointsLost: number;
  overallScore: number;
  onViewFinding?: (category: string) => void;
}

export const WhyPointsLost: React.FC<WhyPointsLostProps> = ({
  penalties,
  totalPointsLost,
  overallScore,
  onViewFinding
}) => {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="lg lg-static p-8" style={{ borderRadius: 24 }}>
        <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Attribution</p>
        <h2 className="mt-2 font-black text-4xl" style={{ letterSpacing: "-0.03em" }}>Why {totalPointsLost} points were lost</h2>
        <p className="mt-2 text-sm text-white/50">100 − {totalPointsLost} = {overallScore}. Each item maps to an exact region of the site.</p>
      </div>
      <div className="space-y-3">
        {penalties.length === 0 ? (
          <div className="lg lg-static p-8 text-center" style={{ borderRadius: 20 }}>Zero penalty deductions. All bounded security controls passed.</div>
        ) : (
          penalties.map((penalty, idx) => (
            <div key={idx} className="lg lg-static p-5" style={{ borderRadius: 18 }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="uppercase text-white/35" style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}>{penalty.category} · {penalty.severity}</p>
                  <h4 className="mt-1 text-xl font-semibold">{penalty.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{penalty.reason}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/70">−{penalty.points_lost}</span>
                  {onViewFinding && (
                    <button onClick={() => onViewFinding(penalty.category)} className="uppercase text-white/50" style={{ fontSize: "0.62rem", letterSpacing: "0.16em" }}>
                      View finding
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

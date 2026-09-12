"use client";

import React from "react";
import { RegionStatus } from "../lib/types";

function RegionColumn({
  title,
  hint,
  regions,
  empty,
}: {
  title: string;
  hint: string;
  regions: RegionStatus[];
  empty: string;
}) {
  return (
    <div className="lg lg-static p-6" style={{ borderRadius: 20 }}>
      <p className="text-white/40 font-medium uppercase" style={{ letterSpacing: "0.22em", fontSize: "0.62rem" }}>
        {title}
      </p>
      <p className="mt-2 text-sm text-white/50">{hint}</p>
      <div className="mt-5 space-y-3">
        {regions.length === 0 ? (
          <p className="text-sm text-white/35">{empty}</p>
        ) : (
          regions.map((region) => (
            <article key={region.id} className="lg lg-static p-4" style={{ borderRadius: 14 }}>
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-semibold">{region.name}</h4>
                <span className="text-white/50 text-sm">{region.score}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{region.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{region.detail}</p>
              {region.finding_titles.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {region.finding_titles.map((title) => (
                    <li key={title} className="text-xs text-white/45">· {title}</li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export function RegionMap({
  secure = [],
  attention = [],
  vulnerable = [],
}: {
  secure?: RegionStatus[];
  attention?: RegionStatus[];
  vulnerable?: RegionStatus[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <RegionColumn title="Perfectly secure" hint="These regions held." regions={secure} empty="No fully secure regions in this pass." />
      <RegionColumn title="Needs attention" hint="Not failing, but not fully protected." regions={attention} empty="No mixed regions." />
      <RegionColumn title="Vulnerable regions" hint="Exact areas where the site is exposed." regions={vulnerable} empty="No vulnerable regions detected." />
    </div>
  );
}

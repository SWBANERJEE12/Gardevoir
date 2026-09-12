"use client";

import React from "react";
import { TimelineEvent } from "../lib/types";

interface TimelineViewProps {
  timeline: TimelineEvent[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ timeline }) => {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="lg lg-static p-6" style={{ borderRadius: 24 }}>
        <h2 className="font-black text-3xl">Timeline</h2>
        <p className="mt-1 text-sm text-white/45">Gardevoir adaptive loop · {timeline.length} events</p>
      </div>
      <div className="space-y-3">
        {timeline.map((event, idx) => (
          <div key={idx} className="lg lg-static p-5" style={{ borderRadius: 18 }}>
            <p className="uppercase text-white/35" style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}>
              {event.event_type.replaceAll("_", " ")} · {event.timestamp}
            </p>
            <p className="mt-2 leading-relaxed text-white/75">{event.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

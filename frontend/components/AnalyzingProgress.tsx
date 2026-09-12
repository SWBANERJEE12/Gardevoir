"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScanReport } from "../lib/types";
import { flyShootingStar, ShootingStarMark, type StarFrame } from "./ShootingStar";

const TOTAL_CHECKS = 7;

function targetPercent(scan: ScanReport) {
  if (scan.status === "COMPLETED") return 100;
  if (scan.status === "FAILED") return 100;
  const done = scan.tests_completed?.length ?? 0;
  const base = Math.round((done / TOTAL_CHECKS) * 100);
  if (scan.status === "PENDING") return Math.max(base, 4);
  return Math.min(99, Math.max(base + 8, 6));
}

function starOnBar(track: DOMRect, percent: number): StarFrame {
  return {
    x: track.left + track.width * (Math.min(100, Math.max(0, percent)) / 100),
    y: track.top + track.height / 2,
    angle: 0,
    opacity: 1,
    scale: 1,
    shine: 0,
    shineIn: 0,
  };
}

export function AnalyzingProgress({
  scan,
  onFinished,
}: {
  scan: ScanReport;
  onFinished?: () => void;
}) {
  const [percent, setPercent] = useState(4);
  const [flight, setFlight] = useState<StarFrame | null>(null);
  const [barStar, setBarStar] = useState<StarFrame | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const goal = targetPercent(scan);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPercent((current) => {
        if (current >= goal) return goal;
        const step = Math.max(1, Math.ceil((goal - current) / 10));
        return Math.min(goal, current + step);
      });
    }, 80);
    return () => window.clearInterval(id);
  }, [goal]);

  useEffect(() => {
    if (flight) return;
    const place = () => {
      const track = trackRef.current?.getBoundingClientRect();
      if (!track || percent <= 2) {
        setBarStar(null);
        return;
      }
      setBarStar(starOnBar(track, percent));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [percent, flight]);

  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (scan.status !== "COMPLETED" || percent < 100 || started.current) return;
    const track = trackRef.current?.getBoundingClientRect();
    if (!track) return;
    started.current = true;
    const start = starOnBar(track, 100);
    setFlight(start);
    const stop = flyShootingStar(start, setFlight, () => {
      finishedRef.current?.();
    });
    return stop;
  }, [percent, scan.status]);

  const star = flight ?? barStar;
  const shine = flight?.shine ?? 0;
  const shineIn = flight?.shineIn ?? 0;
  const shineScale = 0.35 + shine * 2.4 * (1 - shineIn * 0.92);
  const shineOpacity = Math.max(0, shine * 0.9 * (1 - shineIn));

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-2 pt-6">
      <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>
        Assessment
      </p>
      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">Analyzing...</h2>
      <p className="mt-3 truncate text-sm text-white/45">{scan.target_url}</p>
      <p className="mt-2 min-h-5 text-sm text-white/50">{scan.current_step || "Starting checks"}</p>

      <div className="relative mt-10 flex items-center gap-4">
        <div ref={trackRef} className="relative h-5 flex-1">
          <div className="h-5 overflow-hidden rounded-full bg-white/10">
            <div className="comet-fill h-full" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-white/80">{percent}%</span>
      </div>

      {star && star.opacity > 0.02 && (
        <ShootingStarMark
          x={star.x}
          y={star.y}
          angle={star.angle}
          opacity={star.opacity}
          scale={star.scale}
        />
      )}

      {shine > 0.01 && (
        <>
          <div
            className="star-shine star-shine-core"
            style={{
              left: flight?.x,
              top: flight?.y,
              opacity: shineOpacity,
              transform: `translate(-50%, -50%) scale(${shineScale})`,
            }}
          />
          <div
            className="star-shine star-shine-halo"
            style={{
              left: flight?.x,
              top: flight?.y,
              opacity: shineOpacity * 0.85,
              transform: `translate(-50%, -50%) scale(${shineScale * 1.65})`,
            }}
          />
        </>
      )}
    </div>
  );
}

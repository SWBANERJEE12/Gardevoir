"use client";

import React from "react";

type Pt = { x: number; y: number };

function cubic(a: Pt, c1: Pt, c2: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return {
    x: uuu * a.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * b.x,
    y: uuu * a.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * b.y,
  };
}

type Seg = { a: Pt; c1: Pt; c2: Pt; b: Pt };

function pointOnPath(segs: Seg[], t: number): Pt {
  const n = segs.length;
  const clamped = Math.min(0.9999, Math.max(0, t));
  const scaled = clamped * n;
  const i = Math.min(n - 1, Math.floor(scaled));
  const local = scaled - i;
  const s = segs[i];
  return cubic(s.a, s.c1, s.c2, s.b, local);
}

function easeInOutSmooth(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Source art has the long tail pointing down. Rotate so the tail trails opposite travel. */
export const TAIL_OFFSET = Math.PI / 2;
export const STAR_CORE_Y = 0.38;

export type StarFrame = {
  x: number;
  y: number;
  angle: number;
  opacity: number;
  scale: number;
  shine: number;
  shineIn: number;
};

export function ShootingStarMark({
  x,
  y,
  angle,
  opacity = 1,
  scale = 1,
}: {
  x: number;
  y: number;
  angle: number;
  opacity?: number;
  scale?: number;
}) {
  return (
    <img
      src="/spark-star.png"
      alt=""
      className="shooting-star"
      style={{
        left: x,
        top: y,
        opacity,
        transform: `translate(-50%, -${STAR_CORE_Y * 100}%) rotate(${angle + TAIL_OFFSET}rad) scale(${scale})`,
      }}
    />
  );
}

export function flyShootingStar(
  start: Pt,
  onFrame: (state: StarFrame) => void,
  onDone: () => void,
) {
  const g = document.getElementById("gardevoir-mark")?.getBoundingClientRect();
  const W = window.innerWidth;
  const H = window.innerHeight;
  const end = g
    ? { x: g.left + g.width / 2, y: g.top + g.height / 2 }
    : { x: 48, y: 56 };

  const lift: Pt = { x: start.x + Math.min(120, W * 0.1), y: start.y };
  const tr: Pt = { x: W * 0.86, y: H * 0.16 };
  const mid: Pt = { x: W * 0.5, y: H * 0.76 };

  const segs: Seg[] = [
    {
      a: start,
      c1: { x: start.x + 90, y: start.y },
      c2: { x: lift.x + 40, y: start.y - 8 },
      b: lift,
    },
    {
      a: lift,
      c1: { x: lift.x + W * 0.12, y: lift.y - H * 0.02 },
      c2: { x: W * 0.74, y: start.y - H * 0.08 },
      b: tr,
    },
    {
      a: tr,
      c1: { x: W * 0.97, y: H * 0.18 },
      c2: { x: W * 0.9, y: H * 0.7 },
      b: mid,
    },
    {
      a: mid,
      c1: { x: W * 0.24, y: H * 0.78 },
      c2: { x: end.x + W * 0.14, y: end.y + H * 0.26 },
      b: end,
    },
  ];

  const duration = 5600;
  const travelEnd = 0.76;
  let startTime = 0;
  let angle = 0;
  let raf = 0;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    if (!startTime) startTime = now;
    const t = Math.min(1, (now - startTime) / duration);

    let p = end;
    let opacity = 1;
    let scale = 1;
    let shine = 0;
    let shineIn = 0;

    if (t <= travelEnd) {
      const e = easeInOutSmooth(t / travelEnd);
      p = pointOnPath(segs, e);
      const ahead = pointOnPath(segs, Math.min(0.9999, e + 0.012));
      const raw = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      angle = lerpAngle(angle, raw, t < 0.08 ? 0.045 : 0.07);
    } else {
      p = end;
      const local = (t - travelEnd) / (1 - travelEnd);
      opacity = Math.max(0, 1 - local * 1.15);
      scale = Math.max(0.55, 1 - local * 0.4);
      if (local < 0.42) {
        shine = easeInOutSmooth(local / 0.42);
        shineIn = 0;
      } else {
        shine = 1;
        shineIn = easeInOutSmooth((local - 0.42) / 0.58);
      }
    }

    onFrame({ x: p.x, y: p.y, angle, opacity, scale, shine, shineIn });
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone();
  };

  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

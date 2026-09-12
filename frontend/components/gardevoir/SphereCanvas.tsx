"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, MutableRefObject } from "react";

export type SpherePhase =
  | "idle"
  | "zoom-in"
  | "move-left"
  | "settled-left"
  | "swing-right"
  | "settled-right"
  | "orbit";

export type SphereAnim = {
  ry: number;
  rx: number;
  phase: SpherePhase;
  phaseStart: number;
  cxFrac: number;
  cyFrac: number;
  rFrac: number;
};

function fibonacciSphere(n: number) {
  const phi = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = phi * i;
    return { x: Math.cos(t) * r, y, z: Math.sin(t) * r };
  });
}

function makeStars(n: number) {
  let s = 9371;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  return Array.from({ length: n }, () => ({
    x: rng(),
    y: rng(),
    r: rng() * 1.6 + 0.5,
    minO: rng() * 0.22 + 0.18,
    maxO: rng() * 0.42 + 0.52,
    spd: rng() * 1.9 + 0.35,
    ph: rng() * Math.PI * 2,
  }));
}

const PARTICLES = fibonacciSphere(240);
const STARS = makeStars(400);
const EDGE_PAIRS: Array<[number, number]> = [];
{
  const maxD2 = 0.35 * 0.35;
  for (let i = 0; i < PARTICLES.length; i++) {
    for (let j = i + 1; j < PARTICLES.length; j++) {
      const dx = PARTICLES[i].x - PARTICLES[j].x;
      const dy = PARTICLES[i].y - PARTICLES[j].y;
      const dz = PARTICLES[i].z - PARTICLES[j].z;
      if (dx * dx + dy * dy + dz * dz < maxD2) EDGE_PAIRS.push([i, j]);
    }
  }
}

const easeOut4 = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createSphereAnim(initial?: Partial<SphereAnim>): SphereAnim {
  return {
    ry: 0,
    rx: 0.15,
    phase: "idle",
    phaseStart: 0,
    cxFrac: 0.5,
    cyFrac: 0.5,
    rFrac: 0.185,
    ...initial,
  };
}

interface SphereCanvasProps {
  animRef: MutableRefObject<SphereAnim>;
  onIdleClick?: () => void;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function SphereCanvas({
  animRef,
  className = "absolute inset-0",
  style,
}: SphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      isMobRef.current = w < 768;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let running = true;

    const sx = new Float32Array(PARTICLES.length);
    const sy = new Float32Array(PARTICLES.length);
    const sz = new Float32Array(PARTICLES.length);
    const pe = new Float32Array(PARTICLES.length);

    const draw = (time: number) => {
      if (!running) return;
      const a = animRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const mob = isMobRef.current;
      const el = time - a.phaseStart;

      a.ry += a.phase === "orbit" ? 0.006 : 0.0038;
      a.rx += a.phase === "orbit" ? 0.0011 : 0.0003;

      if (a.phase === "orbit") {
        const period = 22000;
        const theta = ((time % period) / period) * Math.PI * 2;
        const tilt = Math.PI / 4;
        const A = 0.44 * Math.hypot(W, H);
        const B = A * 0.34;
        const ux = Math.SQRT1_2;
        const uy = -Math.SQRT1_2;
        const vx = Math.SQRT1_2;
        const vy = Math.SQRT1_2;
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const along = A * c;
        const across = B * s * Math.cos(tilt);
        const z = B * s * Math.sin(tilt);
        const px = W * 0.5 + along * ux + across * vx;
        const py = H * 0.5 + along * uy + across * vy;
        a.cxFrac = px / W;
        a.cyFrac = py / H;
        const zMax = Math.max(1, B * Math.sin(tilt));
        const depth = (z / zMax + 1) / 2;
        a.rFrac = lerp(0.07, 0.2, depth);
      } else if (a.phase === "zoom-in") {
        const t = Math.min(el / 460, 1);
        a.rFrac = lerp(0.185, 0.405, easeOut4(t));
        if (t >= 1) {
          a.phase = "move-left";
          a.phaseStart = time;
        }
      } else if (a.phase === "move-left") {
        const t = Math.min(el / 820, 1);
        const e = easeInOut(t);
        a.cxFrac = mob ? 0.5 : lerp(0.5, 0.22, e);
        a.cyFrac = mob ? 0.38 : 0.5;
        a.rFrac = mob ? lerp(0.405, 0.185, e) : lerp(0.405, 0.315, e);
        if (t >= 1) {
          a.phase = "settled-left";
          a.cxFrac = mob ? 0.5 : 0.22;
          a.cyFrac = mob ? 0.38 : 0.5;
          a.rFrac = mob ? 0.185 : 0.315;
        }
      } else if (a.phase === "swing-right") {
        const t = Math.min(el / 1600, 1);
        const e = smootherstep(t);
        a.cxFrac = mob ? 0.5 : lerp(0.22, 0.78, e);
        a.cyFrac = mob ? 0.35 : 0.5;
        a.rFrac = mob ? lerp(0.185, 0.22, e) : lerp(0.315, 0.37, e);
        a.ry += 0.004 * Math.sin(t * Math.PI);
        if (t >= 1) {
          a.phase = "settled-right";
          a.cxFrac = mob ? 0.5 : 0.78;
          a.cyFrac = mob ? 0.35 : 0.5;
          a.rFrac = mob ? 0.22 : 0.37;
        }
      }

      ctx.clearRect(0, 0, W, H);

      for (let s = 0; s < STARS.length; s++) {
        const st = STARS[s];
        const blink = 0.5 + 0.5 * Math.sin(time * 0.001 * st.spd + st.ph);
        const opacity = st.minO + blink * (st.maxO - st.minO);
        ctx.beginPath();
        ctx.arc(st.x * W, st.y * H, st.r * (0.82 + 0.18 * blink), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,240,255,${opacity})`;
        ctx.fill();
      }

      const cx = W * a.cxFrac;
      const cy = H * a.cyFrac;
      const radius = Math.min(W, H) * a.rFrac;
      const far = a.phase === "orbit" ? Math.max(0.42, Math.min(1, (a.rFrac - 0.07) / 0.13)) : 1;

      const aura = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.0);
      aura.addColorStop(0, `rgba(120,70,255,${0.32 * far})`);
      aura.addColorStop(0.4, `rgba(90,40,210,${0.14 * far})`);
      aura.addColorStop(0.8, `rgba(40,10,90,${0.06 * far})`);
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 2.0, 0, Math.PI * 2);
      ctx.fill();

      const cosY = Math.cos(a.ry);
      const sinY = Math.sin(a.ry);
      const cosX = Math.cos(a.rx);
      const sinX = Math.sin(a.rx);

      for (let i = 0; i < PARTICLES.length; i++) {
        const p = PARTICLES[i];
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const perspective = (z2 + 2.6) / 3.6;
        sx[i] = cx + x1 * radius * perspective;
        sy[i] = cy + y1 * radius * perspective;
        sz[i] = z2;
        pe[i] = perspective;
      }

      ctx.lineWidth = 0.6;
      for (let e = 0; e < EDGE_PAIRS.length; e++) {
        const i = EDGE_PAIRS[e][0];
        const j = EDGE_PAIRS[e][1];
        const dx = sx[i] - sx[j];
        const dy = sy[i] - sy[j];
        const d = Math.sqrt(dx * dx + dy * dy);
        const thresh = radius * 0.3;
        if (d >= thresh) continue;
        const vis = (Math.max(0, (sz[i] + sz[j]) * 0.5 + 0.9) / 1.9) * far;
        ctx.strokeStyle = `rgba(200,215,255,${(1 - d / thresh) * 0.5 * vis})`;
        ctx.beginPath();
        ctx.moveTo(sx[i], sy[i]);
        ctx.lineTo(sx[j], sy[j]);
        ctx.stroke();
      }

      for (let i = 0; i < PARTICLES.length; i++) {
        const bright = Math.max(0.08, (sz[i] + 1) * 0.5);
        const size = 0.85 + pe[i] * 1.9;
        ctx.beginPath();
        ctx.arc(sx[i], sy[i], size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (bright + 0.18) * (0.55 + 0.45 * far))})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [animRef]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        background: "transparent",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProviders, login, oauthUrl, setToken, signup } from "../../lib/auth";
import { ProviderStatus } from "../../lib/types";

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

type SpherePhase =
  | "idle"
  | "zoom-in"
  | "move-left"
  | "settled-left"
  | "swing-right"
  | "settled-right";

type Panel = "hidden" | "hero-in" | "hero" | "hero-out" | "signin-in" | "signin";

const GoogleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function OfficialStartPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobRef = useRef(window.innerWidth < 768);

  const sp = useRef({
    ry: 0,
    rx: 0.15,
    phase: "idle" as SpherePhase,
    phaseStart: 0,
    cxFrac: 0.5,
    cyFrac: 0.5,
    rFrac: (Math.min(window.innerWidth, window.innerHeight) * 0.185) / window.innerWidth,
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sphereClicked, setSphereClicked] = useState(false);
  const [panel, setPanel] = useState<Panel>("hidden");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus>({ google: false, github: false });

  const easeOut4 = (t: number) => 1 - Math.pow(1 - t, 4);
  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      isMobRef.current = window.innerWidth < 768;
      setIsMobile(window.innerWidth < 768);
      if (sp.current.phase === "idle") {
        sp.current.rFrac = (Math.min(canvas.width, canvas.height) * 0.185) / canvas.width;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let raf: number;

    const draw = (time: number) => {
      const a = sp.current;
      const W = canvas.width;
      const H = canvas.height;
      const mob = isMobRef.current;
      const el = time - a.phaseStart;

      a.ry += 0.0038;
      a.rx += 0.0003;

      const idleRw = (Math.min(W, H) * 0.185) / W;
      const zoomRw = (Math.min(W, H) * 0.64) / W;
      const sideRw = 0.225;
      const leftCx = 0.225;
      const rightCx = 0.775;

      if (a.phase === "zoom-in") {
        const t = Math.min(el / 560, 1);
        a.rFrac = lerp(idleRw, zoomRw, easeOut4(t));
        if (t >= 1) {
          a.phase = "move-left";
          a.phaseStart = time;
        }
      } else if (a.phase === "move-left") {
        const t = Math.min(el / 920, 1);
        const e = easeInOut(t);
        a.cxFrac = mob ? 0.5 : lerp(0.5, leftCx, e);
        a.cyFrac = mob ? lerp(0.5, 0.28, e) : 0.5;
        a.rFrac = lerp(zoomRw, sideRw, e);
        if (t >= 1) {
          a.phase = "settled-left";
          a.cxFrac = mob ? 0.5 : leftCx;
          a.cyFrac = mob ? 0.28 : 0.5;
          a.rFrac = sideRw;
        }
      } else if (a.phase === "swing-right") {
        const t = Math.min(el / 1600, 1);
        const e = smootherstep(t);
        a.cxFrac = mob ? 0.5 : lerp(leftCx, rightCx, e);
        a.cyFrac = mob ? 0.28 : 0.5;
        a.rFrac = sideRw;
        a.ry += 0.004 * Math.sin(t * Math.PI);
        if (t >= 1) {
          a.phase = "settled-right";
          a.cxFrac = mob ? 0.5 : rightCx;
          a.cyFrac = mob ? 0.28 : 0.5;
          a.rFrac = sideRw;
        }
      }

      ctx.clearRect(0, 0, W, H);

      STARS.forEach((st) => {
        const blink = 0.5 + 0.5 * Math.sin(time * 0.001 * st.spd + st.ph);
        const opacity = st.minO + blink * (st.maxO - st.minO);
        const r = st.r * (0.82 + 0.18 * blink);
        const sx = st.x * W;
        const sy = st.y * H;

        if (opacity > 0.58) {
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4.2);
          g.addColorStop(0, `rgba(215,225,255,${opacity * 0.4})`);
          g.addColorStop(1, "rgba(200,218,255,0)");
          ctx.beginPath();
          ctx.arc(sx, sy, r * 4.2, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,240,255,${opacity})`;
        ctx.fill();
      });

      const cx = W * a.cxFrac;
      const cy = H * a.cyFrac;
      const radius = W * a.rFrac;

      const aura = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.0);
      aura.addColorStop(0, "rgba(100,45,210,0.20)");
      aura.addColorStop(0.4, "rgba(70,15,150,0.09)");
      aura.addColorStop(0.8, "rgba(30,5,70,0.04)");
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 2.0, 0, Math.PI * 2);
      ctx.fill();

      const cosY = Math.cos(a.ry),
        sinY = Math.sin(a.ry);
      const cosX = Math.cos(a.rx),
        sinX = Math.sin(a.rx);

      const proj = PARTICLES.map((p) => {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const pe = (z2 + 2.6) / 3.6;
        return { sx: cx + x1 * radius * pe, sy: cy + y1 * radius * pe, z: z2, pe };
      });

      const thresh = radius * 0.3;
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const dx = proj[i].sx - proj[j].sx;
          const dy = proj[i].sy - proj[j].sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < thresh) {
            const vis = Math.max(0, (proj[i].z + proj[j].z) * 0.5 + 0.9) / 1.9;
            const alpha = (1 - d / thresh) * 0.5 * vis;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200,215,255,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(proj[i].sx, proj[i].sy);
            ctx.lineTo(proj[j].sx, proj[j].sy);
            ctx.stroke();
          }
        }
      }

      proj.forEach((p) => {
        const bright = Math.max(0.08, (p.z + 1) * 0.5);
        const size = 0.85 + p.pe * 1.9;
        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, size * 4);
        g.addColorStop(0, `rgba(255,255,255,${bright * 0.32})`);
        g.addColorStop(1, "rgba(210,215,255,0)");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size * 4, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, bright + 0.12)})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    getProviders().then(setProviders).catch(() => undefined);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSphereClick = useCallback(() => {
    if (sp.current.phase !== "idle") return;
    setSphereClicked(true);
    sp.current.phase = "zoom-in";
    sp.current.phaseStart = performance.now();
    setTimeout(() => {
      setPanel("hero-in");
      setTimeout(() => setPanel("hero"), 900);
    }, 1480);
  }, []);

  const handleSignIn = useCallback(() => {
    if (panel !== "hero") return;
    setPanel("hero-out");
    sp.current.phase = "swing-right";
    sp.current.phaseStart = performance.now();
    window.setTimeout(() => setPanel("signin-in"), 920);
    window.setTimeout(() => setPanel("signin"), 920 + 1250);
  }, [panel]);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "signup" ? await signup(email, password, name) : await login(email, password);
      setToken(result.token);
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const startOAuth = (provider: "google" | "github") => {
    const ready = provider === "google" ? providers.google : providers.github;
    if (!ready) {
      setError(
        provider === "google"
          ? "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env to enable Google sign-in."
          : "Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to backend/.env to enable GitHub sign-in."
      );
      return;
    }
    window.location.href = oauthUrl(provider, mode);
  };

  const heroVisible = panel === "hero-in" || panel === "hero" || panel === "hero-out";
  const signinVisible = panel === "signin-in" || panel === "signin";

  const heroAnim = panel === "hero-in" ? "anim-emerge" : panel === "hero-out" ? "anim-away" : "";
  const signinAnim = panel === "signin-in" ? "anim-emerge-r" : "";

  const d = (ms: number) => ({ animationDelay: `${ms}ms` });

  const heroStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 25,
    left: isMobile ? "1.5rem" : "50%",
    right: isMobile ? "1.5rem" : "3.5rem",
    paddingTop: isMobile ? "38%" : 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    pointerEvents: panel === "hero-out" ? "none" : "auto",
  };

  const signinStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 25,
    left: isMobile ? "1.5rem" : "3.5rem",
    right: isMobile ? "1.5rem" : "50%",
    paddingTop: isMobile ? "38%" : 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    pointerEvents: "auto",
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: "#02040b", fontFamily: "'Inter', sans-serif" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          zIndex: 20,
          cursor: sphereClicked ? "default" : "pointer",
          pointerEvents: sphereClicked ? "none" : "auto",
        }}
        onClick={handleSphereClick}
      />

      <nav
        className="absolute top-0 left-0 right-0 flex items-center justify-between pointer-events-none"
        style={{ zIndex: 30, padding: isMobile ? "1.5rem 1.25rem" : "1.8rem 2.8rem" }}
      >
        <div className="brand" aria-label="Gardevoir, made by ctrl shift N">
          <div className="brand-word">
            <span className="brand-g">G</span>
            <span className="brand-rest">ardevoir</span>
          </div>
          <span className="brand-sub">made by ctrl shift N</span>
        </div>
      </nav>

      {heroVisible && (
        <div style={heroStyle}>
          <h1
            className={`text-white font-black leading-none ${heroAnim}`}
            style={{
              fontSize: isMobile ? "clamp(3rem,16vw,4.5rem)" : "clamp(4.5rem,7vw,7rem)",
              letterSpacing: "-0.025em",
              lineHeight: 0.9,
              marginBottom: isMobile ? "1.4rem" : "2rem",
              transformOrigin: "left center",
              ...d(0),
            }}
          >
            TEST<br />YOUR<br />WEB
          </h1>

          <p
            className={`text-white/50 leading-loose ${heroAnim}`}
            style={{
              fontSize: isMobile ? "0.84rem" : "0.92rem",
              letterSpacing: "0.04em",
              maxWidth: "20rem",
              marginBottom: isMobile ? "2rem" : "2.8rem",
              transformOrigin: "left center",
              ...d(80),
            }}
          >
            Intelligent security testing.<br />
            Uncover vulnerabilities<br />
            before they become liabilities.
          </p>

          <div className={heroAnim} style={{ transformOrigin: "left center", ...d(165) }}>
            <button
              type="button"
              onClick={panel === "hero" ? handleSignIn : undefined}
              className="lg text-white font-semibold uppercase"
              style={{
                letterSpacing: "0.15em",
                fontSize: "0.78rem",
                padding: "1rem 2.6rem",
                borderRadius: "14px",
                cursor: "pointer",
                background: "rgba(255,255,255,0.13)",
                borderColor: "rgba(255,255,255,0.32)",
                boxShadow: `
                  0 4px 28px rgba(120,80,255,0.22),
                  0 2px 12px rgba(0,0,0,0.4),
                  inset 0 1.5px 0 rgba(255,255,255,0.24),
                  inset 0 -1px 0 rgba(0,0,0,0.14)
                `,
              }}
            >
              Sign In  →
            </button>
          </div>
        </div>
      )}

      {signinVisible && (
        <div style={signinStyle}>
          <p
            className={`text-white/40 font-medium uppercase ${signinAnim}`}
            style={{
              letterSpacing: "0.22em",
              fontSize: "0.62rem",
              marginBottom: "1rem",
              transformOrigin: "left center",
              ...d(0),
            }}
          >
            {mode === "login" ? "Welcome back" : "New here"}
          </p>

          <h2
            className={`text-white font-black leading-none ${signinAnim}`}
            style={{
              fontSize: isMobile ? "clamp(2.8rem,13vw,4rem)" : "clamp(3.5rem,5.5vw,5.5rem)",
              letterSpacing: "-0.025em",
              lineHeight: 0.9,
              marginBottom: isMobile ? "1.8rem" : "2.2rem",
              transformOrigin: "left center",
              ...d(40),
            }}
          >
            {mode === "login" ? (
              <>
                Sign<br />In
              </>
            ) : (
              <>
                Create<br />Account
              </>
            )}
          </h2>

          <form onSubmit={submitAuth}>
            {mode === "signup" && (
              <div className={signinAnim} style={{ transformOrigin: "left center", marginBottom: "0.85rem", ...d(80) }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="your name"
                  className="lg-input w-full text-white placeholder:text-white/30 font-medium"
                  style={{
                    display: "block",
                    borderRadius: "12px",
                    padding: "1rem 1.4rem",
                    fontSize: "0.88rem",
                    letterSpacing: "0.02em",
                    color: "white",
                    maxWidth: "26rem",
                    width: "100%",
                  }}
                />
              </div>
            )}

            <div className={signinAnim} style={{ transformOrigin: "left center", marginBottom: "0.85rem", ...d(110) }}>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="lg-input w-full text-white placeholder:text-white/30 font-medium"
                style={{
                  display: "block",
                  borderRadius: "12px",
                  padding: "1rem 1.4rem",
                  fontSize: "0.88rem",
                  letterSpacing: "0.02em",
                  color: "white",
                  maxWidth: "26rem",
                  width: "100%",
                }}
              />
            </div>

            <div className={signinAnim} style={{ transformOrigin: "left center", marginBottom: "0.85rem", ...d(140) }}>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "choose a password" : "your password"}
                className="lg-input w-full text-white placeholder:text-white/30 font-medium"
                style={{
                  display: "block",
                  borderRadius: "12px",
                  padding: "1rem 1.4rem",
                  fontSize: "0.88rem",
                  letterSpacing: "0.02em",
                  color: "white",
                  maxWidth: "26rem",
                  width: "100%",
                }}
              />
            </div>

            {error && (
              <p className="text-white/70" style={{ fontSize: "0.75rem", maxWidth: "26rem", marginBottom: "0.85rem" }}>
                {error}
              </p>
            )}

            <div className={signinAnim} style={{ transformOrigin: "left center", marginBottom: "0.75rem", ...d(170) }}>
              <button
                type="submit"
                disabled={busy}
                className="lg text-white font-semibold uppercase"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  borderRadius: "12px",
                  padding: "0.95rem 1.4rem",
                  fontSize: "0.78rem",
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                  maxWidth: "26rem",
                  width: "100%",
                }}
              >
                {busy ? "Please wait" : mode === "login" ? "Enter  →" : "Create  →"}
              </button>
            </div>
          </form>

          <div className={signinAnim} style={{ transformOrigin: "left center", marginBottom: "0.75rem", ...d(200) }}>
            <button
              type="button"
              onClick={() => startOAuth("google")}
              className="lg flex items-center justify-center gap-3 font-semibold text-white/90"
              style={{
                display: "flex",
                borderRadius: "12px",
                padding: "0.95rem 1.4rem",
                fontSize: "0.82rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                maxWidth: "26rem",
                width: "100%",
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div className={signinAnim} style={{ transformOrigin: "left center", ...d(230) }}>
            <button
              type="button"
              onClick={() => startOAuth("github")}
              className="lg flex items-center justify-center gap-3 font-semibold text-white/90"
              style={{
                display: "flex",
                borderRadius: "12px",
                padding: "0.95rem 1.4rem",
                fontSize: "0.82rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                maxWidth: "26rem",
                width: "100%",
              }}
            >
              <GitHubIcon />
              Continue with GitHub
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className={`text-white/40 font-medium uppercase ${signinAnim}`}
            style={{
              letterSpacing: "0.18em",
              fontSize: "0.62rem",
              marginTop: "1.4rem",
              textAlign: "left",
              maxWidth: "26rem",
              transformOrigin: "left center",
              ...d(260),
            }}
          >
            {mode === "login" ? "New here? Create account" : "Already have an account? Sign in"}
          </button>
        </div>
      )}

      {!sphereClicked && (
        <div className="absolute bottom-14 left-1/2 pointer-events-none hint-pulse" style={{ zIndex: 30 }}>
          <span className="text-white/40 uppercase" style={{ letterSpacing: "0.28em", fontSize: "0.60rem" }}>
            Click to enter
          </span>
        </div>
      )}
    </div>
  );
}

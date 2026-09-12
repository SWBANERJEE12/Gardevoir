"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSphereAnim, SphereCanvas } from "./SphereCanvas";
import { getProviders, login, oauthUrl, setToken, signup } from "../../lib/auth";
import { ProviderStatus } from "../../lib/types";

type Panel = "hidden" | "hero-in" | "hero" | "hero-out" | "signin-in" | "signin";

const GoogleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

export function StartPage({ initial = "idle" }: { initial?: "idle" | "signin" | "signup" }) {
  const router = useRouter();
  const skipIntro = initial !== "idle";
  const sp = useRef(
    createSphereAnim(
      skipIntro
        ? {
            phase: "settled-right",
            cxFrac: 0.78,
            cyFrac: 0.5,
            rFrac: 0.37,
          }
        : undefined
    )
  );

  const [isMobile, setIsMobile] = useState(false);
  const [sphereClicked, setSphereClicked] = useState(skipIntro);
  const [panel, setPanel] = useState<Panel>(skipIntro ? "signin-in" : "hidden");
  const [mode, setMode] = useState<"login" | "signup">(initial === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus>({ google: false, github: false });

  const [canvasOn, setCanvasOn] = useState(true);

  useEffect(() => {
    const apply = () => setIsMobile(window.innerWidth < 768);
    apply();
    window.addEventListener("resize", apply);
    getProviders().then(setProviders).catch(() => undefined);
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setError(err);
    if (skipIntro) {
      setPanel("signin-in");
      const settle = window.setTimeout(() => setPanel("signin"), 1250);
      return () => {
        window.removeEventListener("resize", apply);
        window.clearTimeout(settle);
      };
    }
    return () => {
      window.removeEventListener("resize", apply);
    };
  }, [skipIntro]);

  const handleSphereClick = useCallback(() => {
    if (sp.current.phase !== "idle") return;
    setSphereClicked(true);
    sp.current.phase = "zoom-in";
    sp.current.phaseStart = performance.now();
    setTimeout(() => {
      setPanel("hero-in");
      setTimeout(() => setPanel("hero"), 750);
    }, 1280);
  }, []);

  const handleSignIn = useCallback(() => {
    if (panel !== "hero") return;
    setPanel("hero-out");
    sp.current.phase = "swing-right";
    sp.current.phaseStart = performance.now();
    window.setTimeout(() => setPanel("signin-in"), 920);
    window.setTimeout(() => setPanel("signin"), 920 + 1250);
  }, [panel]);

  const heroVisible = panel === "hero-in" || panel === "hero" || panel === "hero-out";
  const signinVisible = panel === "signin-in" || panel === "signin";
  const heroAnim = panel === "hero-in" ? "anim-emerge" : panel === "hero-out" ? "anim-away" : "";
  const signinAnim = panel === "signin-in" ? "anim-emerge-r" : "";
  const d = (ms: number) => ({ animationDelay: `${ms}ms` });

  const heroStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 50,
    left: isMobile ? "1.5rem" : "44%",
    right: isMobile ? "1.5rem" : "3.5rem",
    paddingTop: isMobile ? "32%" : 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    color: "#fff",
    transform: "translateZ(0)",
    pointerEvents: "auto",
  };

  const signinStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 50,
    left: isMobile ? "1.5rem" : "3.5rem",
    right: isMobile ? "1.5rem" : "50%",
    paddingTop: isMobile ? "52%" : 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    color: "#fff",
    transform: "translateZ(0)",
    pointerEvents: "auto",
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    borderRadius: "12px",
    padding: "1rem 1.4rem",
    fontSize: "0.88rem",
    letterSpacing: "0.02em",
    color: "white",
    maxWidth: "26rem",
    width: "100%",
  };

  const oauthStyle: React.CSSProperties = {
    display: "flex",
    borderRadius: "12px",
    padding: "0.95rem 1.4rem",
    fontSize: "0.82rem",
    letterSpacing: "0.05em",
    cursor: "pointer",
    maxWidth: "26rem",
    width: "100%",
  };

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

  return (
    <div
      className="relative select-none"
      style={{
        background: "#02040b",
        color: "#ffffff",
        fontFamily: "Inter, Segoe UI, sans-serif",
        cursor: sphereClicked ? "default" : "pointer",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        isolation: "isolate",
      }}
      onClick={() => {
        if (!sphereClicked) handleSphereClick();
      }}
    >
      {canvasOn && (
        <SphereCanvas
          animRef={sp}
          style={{ zIndex: 0, position: "absolute", inset: 0 }}
        />
      )}

      {!sphereClicked && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "min(42vw, 46vh)",
            height: "min(42vw, 46vh)",
            marginLeft: "calc(min(42vw, 46vh) / -2)",
            marginTop: "calc(min(42vw, 46vh) / -2)",
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 2,
            background:
              "radial-gradient(circle at 42% 38%, rgba(255,255,255,0.7) 0%, rgba(180,190,255,0.35) 18%, rgba(110,70,255,0.28) 42%, rgba(20,8,40,0) 70%)",
            boxShadow: "0 0 90px 24px rgba(110,70,255,0.35)",
          }}
        />
      )}

      <nav
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: isMobile ? "1.5rem 1.25rem" : "1.8rem 2.8rem",
          pointerEvents: "none",
          transform: "translateZ(0)",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontWeight: 700,
            letterSpacing: "0.30em",
            fontSize: "0.9rem",
            textTransform: "uppercase",
          }}
        >
          Gardevoir
        </span>
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
              color: "#ffffff",
              fontWeight: 900,
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
              onClick={(e) => {
                e.stopPropagation();
                if (panel === "hero") handleSignIn();
              }}
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
        <div style={signinStyle} onClick={(e) => e.stopPropagation()}>
          <p
            className={`text-white/40 font-medium uppercase ${signinAnim}`}
            style={{
              letterSpacing: "0.22em",
              fontSize: "0.62rem",
              marginBottom: "1rem",
              transformOrigin: "right center",
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
              marginBottom: isMobile ? "2rem" : "2.5rem",
              transformOrigin: "right center",
              ...d(50),
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
              <div className={signinAnim} style={{ transformOrigin: "right center", marginBottom: "0.85rem", ...d(90) }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="your name"
                  className="lg-input w-full text-white placeholder:text-white/30 font-medium"
                  style={inputStyle}
                />
              </div>
            )}

            <div className={signinAnim} style={{ transformOrigin: "right center", marginBottom: "0.85rem", ...d(130) }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="lg-input w-full text-white placeholder:text-white/30 font-medium"
                style={inputStyle}
              />
            </div>

            <div className={signinAnim} style={{ transformOrigin: "right center", marginBottom: "0.85rem", ...d(170) }}>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "choose a password" : "your password"}
                className="lg-input w-full text-white placeholder:text-white/30 font-medium"
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-white/70" style={{ fontSize: "0.75rem", maxWidth: "26rem", marginBottom: "0.85rem" }}>
                {error}
              </p>
            )}

            <div className={signinAnim} style={{ transformOrigin: "right center", marginBottom: "0.75rem", ...d(190) }}>
              <button
                type="submit"
                disabled={busy}
                className="lg text-white font-semibold uppercase"
                style={{
                  ...oauthStyle,
                  letterSpacing: "0.15em",
                  fontSize: "0.78rem",
                  justifyContent: "center",
                }}
              >
                {busy ? "Please wait" : mode === "login" ? "Enter  →" : "Create  →"}
              </button>
            </div>
          </form>

          <div className={signinAnim} style={{ transformOrigin: "right center", marginBottom: "0.75rem", ...d(210) }}>
            <button
              type="button"
              onClick={() => startOAuth("google")}
              className="lg flex items-center justify-center gap-3 font-semibold text-white/90"
              style={oauthStyle}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div className={signinAnim} style={{ transformOrigin: "right center", ...d(285) }}>
            <button
              type="button"
              onClick={() => startOAuth("github")}
              className="lg flex items-center justify-center gap-3 font-semibold text-white/90"
              style={oauthStyle}
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
              transformOrigin: "right center",
              ...d(320),
            }}
          >
            {mode === "login" ? "New here? Create account" : "Already have an account? Sign in"}
          </button>
        </div>
      )}

      {!sphereClicked && (
        <div
          className="hint-pulse"
          style={{
            position: "absolute",
            bottom: "3.5rem",
            left: "50%",
            zIndex: 50,
            pointerEvents: "none",
            transform: "translateZ(0)",
            color: "#ffffff",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              letterSpacing: "0.32em",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            Click to enter
          </span>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";

interface LandingHeroProps {
  onStartScan: (targetUrl: string, authorized: boolean) => void;
  isLoading: boolean;
  demoTargetUrl: string;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartScan,
  isLoading,
  demoTargetUrl,
}) => {
  const [targetUrl, setTargetUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) {
      setError("Please enter a valid target URL");
      return;
    }
    if (!authorized) {
      setError("You must confirm authorization before initiating an assessment");
      return;
    }
    setError(null);
    onStartScan(targetUrl, authorized);
  };

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col px-2 py-6">
      <p className="text-white/40 font-medium uppercase" style={{ letterSpacing: "0.22em", fontSize: "0.62rem" }}>
        Assessment
      </p>
      <h2 className="mt-3 font-semibold leading-tight text-white" style={{ fontSize: "clamp(2rem,5vw,3rem)", letterSpacing: "-0.03em" }}>
        Paste a website URL
      </h2>
      <p className="mt-3 max-w-md text-white/50 leading-relaxed" style={{ fontSize: "0.92rem" }}>
        Intelligent security testing. Uncover vulnerabilities before they become liabilities.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-4">
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://your-app.com or http://localhost:5001"
          className="lg-input w-full text-white placeholder:text-white/30 font-medium"
          style={{ borderRadius: 12, padding: "1rem 1.4rem", fontSize: "0.88rem" }}
        />
        <label className="lg lg-static flex items-start gap-3 p-4" style={{ borderRadius: 12 }}>
          <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-1" />
          <span className="text-sm text-white/60 leading-relaxed">
            I confirm that I own or am explicitly authorized to conduct defensive security testing against this application.
          </span>
        </label>
        {error && <p className="text-sm text-white/70">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isLoading}
            className="lg text-white font-semibold uppercase"
            style={{ letterSpacing: "0.15em", fontSize: "0.78rem", padding: "1rem 2rem", borderRadius: 14 }}
          >
            {isLoading ? "Initializing…" : "Start assessment  →"}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setTargetUrl(demoTargetUrl);
              setAuthorized(true);
              onStartScan(demoTargetUrl, true);
            }}
            className="lg text-white/80 font-semibold uppercase"
            style={{ letterSpacing: "0.15em", fontSize: "0.78rem", padding: "1rem 2rem", borderRadius: 14 }}
          >
            Demo target
          </button>
        </div>
      </form>
    </div>
  );
};

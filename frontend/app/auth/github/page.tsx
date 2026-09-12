"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "../../../lib/auth";

export default function GitHubDevicePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("https://github.com/login/device");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let timer: number | undefined;
    let intervalMs = 5000;

    const poll = async () => {
      const res = await fetch("/api/auth/github/device/poll", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (data.status === "ok" && data.token) {
        setToken(data.token);
        router.replace("/home");
        return;
      }
      if (data.status === "slow_down" && data.interval) {
        intervalMs = (Number(data.interval) + 1) * 1000;
      }
      if (data.detail && res.status >= 400) {
        setError(data.detail);
        return;
      }
      timer = window.setTimeout(poll, intervalMs);
    };

    (async () => {
      const res = await fetch("/api/auth/github/device", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Could not start GitHub sign-in.");
        return;
      }
      setCode(data.user_code);
      setVerifyUrl(data.verification_uri || "https://github.com/login/device");
      intervalMs = Math.max(5, Number(data.interval) || 5) * 1000;
      window.open(data.verification_uri || "https://github.com/login/device", "_blank", "noopener,noreferrer");
      timer = window.setTimeout(poll, intervalMs);
    })();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#02040b] px-6 text-white">
      <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>
        GitHub
      </p>
      <h1 className="mt-4 text-center text-4xl font-semibold tracking-tight">Authorize Gardevoir</h1>
      <p className="mt-3 max-w-md text-center text-sm text-white/50">
        Enter this code on GitHub. This tab waits until you approve access to your repositories.
      </p>
      <p className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 font-mono text-3xl tracking-[0.35em]">
        {code || "••••-••••"}
      </p>
      <a
        href={verifyUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
      >
        Open GitHub
      </a>
      {error && (
        <p className="mt-6 max-w-lg text-center text-sm text-red-300">
          {error}
          <br />
          <span className="mt-2 block text-white/45">
            Also add this callback URL to the GitHub OAuth app: https://gardevoir-mu.vercel.app/api/auth/github/callback
          </span>
        </p>
      )}
    </main>
  );
}

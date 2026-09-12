"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { getProviders, login, oauthUrl, setToken, signup } from "../lib/auth";
import { ProviderStatus } from "../lib/types";

interface AuthPanelProps {
  mode: "login" | "signup";
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(params.get("error"));
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus>({ google: false, github: true });

  useEffect(() => {
    getProviders().then(setProviders).catch(() => undefined);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await signup(email, password, name)
          : await login(email, password);
      setToken(result.token);
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="orb -left-16 top-10 h-64 w-64 bg-[#9fbfa6]/40" />
      <div className="orb right-[-4rem] bottom-10 h-72 w-72 bg-[#e4d3c4]/60" />

      <header className="relative z-10 flex items-center justify-between px-8 py-7 sm:px-12">
        <BrandMark />
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="quiet-btn sans text-[11px] font-medium uppercase tracking-[0.28em] text-[#6b746e] hover:text-[#1c241f]"
        >
          {mode === "login" ? "Create account" : "Sign in"}
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pb-20 pt-6">
        <p className="rise sans text-[11px] uppercase tracking-[0.4em] text-[#6b746e]">
          {mode === "login" ? "Welcome back" : "New to Gardevoir"}
        </p>
        <h1 className="rise rise-delay-1 mt-3 text-5xl font-medium italic tracking-tight">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="rise rise-delay-2 sans mt-3 text-[13px] font-light leading-6 text-[#6b746e]">
          {mode === "login"
            ? "Continue with GitHub, or your email."
            : "Link GitHub, or choose an email and password."}
        </p>

        <div className="rise rise-delay-3 mt-10 space-y-3">
          <a
            href={providers.github ? oauthUrl("github", mode) : undefined}
            onClick={(e) => {
              if (!providers.github) {
                e.preventDefault();
                setError("GitHub sign-in is not configured yet.");
              }
            }}
            className="quiet-btn sans flex w-full items-center justify-center rounded-full border border-[#1c241f]/12 bg-white/55 py-3 text-[11px] uppercase tracking-[0.22em] backdrop-blur-sm hover:border-[#2f6b4f]/35"
          >
            Continue with GitHub
          </a>
        </div>

        <div className="rise rise-delay-3 my-8 flex items-center gap-4">
          <div className="hairline flex-1" />
          <span className="sans text-[10px] uppercase tracking-[0.3em] text-[#8a928c]">or email</span>
          <div className="hairline flex-1" />
        </div>

        <form onSubmit={onSubmit} className="rise rise-delay-4 space-y-4">
          {mode === "signup" && (
            <label className="block text-left">
              <span className="sans text-[10px] uppercase tracking-[0.28em] text-[#6b746e]">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sans mt-2 w-full rounded-2xl border border-[#1c241f]/10 bg-white/50 px-4 py-3 text-sm outline-none transition-all duration-500 focus:border-[#2f6b4f]/50"
                placeholder="Your name"
              />
            </label>
          )}
          <label className="block text-left">
            <span className="sans text-[10px] uppercase tracking-[0.28em] text-[#6b746e]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sans mt-2 w-full rounded-2xl border border-[#1c241f]/10 bg-white/50 px-4 py-3 text-sm outline-none transition-all duration-500 focus:border-[#2f6b4f]/50"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-left">
            <span className="sans text-[10px] uppercase tracking-[0.28em] text-[#6b746e]">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sans mt-2 w-full rounded-2xl border border-[#1c241f]/10 bg-white/50 px-4 py-3 text-sm outline-none transition-all duration-500 focus:border-[#2f6b4f]/50"
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />
          </label>

          {error && (
            <p className="sans rounded-2xl border border-[#b24a4a]/20 bg-[#b24a4a]/8 px-4 py-3 text-xs leading-5 text-[#8a3535]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="quiet-btn sans w-full rounded-full bg-[#1c241f] py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#f4f1ea] disabled:opacity-50"
          >
            {busy ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

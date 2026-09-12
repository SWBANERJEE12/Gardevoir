"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "../../lib/auth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");
    if (token) {
      setToken(token);
      router.replace("/home");
      return;
    }
    router.replace(`/login?error=${encodeURIComponent(error || "Sign-in failed.")}`);
  }, [params, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#02040b]">
      <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Connecting…</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#02040b]" />}>
      <CallbackInner />
    </Suspense>
  );
}

"use client";

import Link from "next/link";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = size === "lg" ? "text-sm tracking-[0.55em]" : size === "sm" ? "text-[10px] tracking-[0.42em]" : "text-xs tracking-[0.48em]";
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-[#2f6b4f]/30 transition-transform duration-700 group-hover:scale-110" />
        <span className="h-2 w-2 rounded-full bg-[#2f6b4f] transition-transform duration-700 group-hover:scale-125" />
      </span>
      <span className={`sans font-light uppercase text-[#1c241f] ${scale}`}>Gardevoir</span>
    </Link>
  );
}

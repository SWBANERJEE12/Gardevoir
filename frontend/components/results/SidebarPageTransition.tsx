"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import type { PageOrigin } from "@/lib/results-nav";

export function SidebarPageTransition({
  pageKey,
  origin,
  children,
}: {
  pageKey: string;
  origin: PageOrigin | null;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const currentKey = useRef(pageKey);
  const [animId, setAnimId] = useState(0);
  const [originCss, setOriginCss] = useState({ x: "0px", y: "24%" });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || !origin) {
      setOriginCss({ x: "0px", y: "24%" });
    } else {
      const r = el.getBoundingClientRect();
      setOriginCss({
        x: `${Math.round(origin.x - r.left)}px`,
        y: `${Math.round(origin.y - r.top)}px`,
      });
    }

    if (pageKey !== currentKey.current) {
      currentKey.current = pageKey;
      setAnimId((id) => id + 1);
    }
  }, [origin, pageKey]);

  return (
    <div ref={wrapRef} className="h-full min-h-0 overflow-hidden">
      <div
        key={animId}
        className="sidebar-page sidebar-page-open"
        style={{
          transformOrigin: `${originCss.x} ${originCss.y}`,
          ["--sb-ox" as string]: originCss.x,
          ["--sb-oy" as string]: originCss.y,
        }}
      >
        {children}
      </div>
    </div>
  );
}

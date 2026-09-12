"use client";

import React, { useRef, useState } from "react";
import {
  Clock3,
  Gauge,
  Globe,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Plus,
  Sparkles,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isOverviewView, originFromElement, type ResultsView } from "@/lib/results-nav";

type OverviewKey = Extract<ResultsView, "overview-score" | "overview-regions" | "overview-analyst">;
export type SidebarActive = ResultsView | "assess";

const OVERVIEW_ITEMS: { id: OverviewKey; label: string; icon: LucideIcon }[] = [
  { id: "overview-score", label: "Score", icon: Gauge },
  { id: "overview-regions", label: "Regions", icon: Map },
  { id: "overview-analyst", label: "Analyst", icon: Sparkles },
];

interface AppSidebar2Props {
  active: SidebarActive;
  resultsEnabled: boolean;
  onSelect: (view: ResultsView, origin: { x: number; y: number }) => void;
  findingsCount: number;
  onNewAssessment: () => void;
  onSignOut: () => void;
}

function NavRow({
  icon: Icon,
  label,
  active,
  expanded,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  expanded: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-11 w-full items-center rounded-2xl text-left transition-colors duration-300",
        expanded ? "gap-3 px-3" : "justify-center px-0",
        disabled ? "cursor-default text-white/25" : "text-white/60 hover:bg-white/10 hover:text-white",
        active && !disabled && "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,opacity,margin] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          expanded ? "ml-0 max-w-[10rem] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function AppSidebar2({
  active,
  resultsEnabled,
  onSelect,
  findingsCount,
  onNewAssessment,
  onSignOut,
}: AppSidebar2Props) {
  const [expanded, setExpanded] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const scheduleOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    if (expanded) return;
    if (openTimer.current) return;
    openTimer.current = window.setTimeout(() => {
      setExpanded(true);
      openTimer.current = null;
    }, 160);
  };

  const scheduleClose = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = null;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setExpanded(false);
      closeTimer.current = null;
    }, 280);
  };

  const pick = (view: ResultsView, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!resultsEnabled) return;
    onSelect(view, originFromElement(event.currentTarget));
  };

  return (
    <div
      className="relative z-30 h-full shrink-0 pr-10"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) scheduleClose();
      }}
    >
      <aside
        className="sidebar-enter lg lg-static flex h-full flex-col overflow-hidden py-4"
        style={{
          borderRadius: 28,
          width: expanded ? 236 : 72,
          transition: "width 700ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
      <div className={cn("mb-4 flex h-11 items-center", expanded ? "gap-3 px-3" : "justify-center")}>
        <div id="gardevoir-mark" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-black tracking-[0.18em] text-white">
          G
        </div>
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap text-sm font-semibold uppercase tracking-[0.22em] text-white/80 transition-[max-width,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            expanded ? "max-w-[9rem] opacity-100" : "max-w-0 opacity-0"
          )}
        >
          Gardevoir
        </span>
      </div>
      <div className="mx-auto mb-3 h-px w-8 bg-white/10" />
      <nav className="flex flex-1 flex-col gap-1 px-2">
        <NavRow icon={Globe} label="Assess" active={active === "assess"} expanded={expanded} onClick={onNewAssessment} />
        <NavRow
          icon={LayoutDashboard}
          label="Overview"
          active={resultsEnabled && isOverviewView(active as ResultsView)}
          expanded={expanded}
          disabled={!resultsEnabled}
          onClick={(event) => pick("overview-score", event)}
        />
        <div
          className={cn(
            "ml-3 overflow-hidden transition-[max-height,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-0.5">
            {OVERVIEW_ITEMS.map((item) => (
              <NavRow
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={active === item.id}
                expanded={expanded}
                disabled={!resultsEnabled}
                onClick={(event) => pick(item.id, event)}
              />
            ))}
          </div>
        </div>
        <NavRow icon={TrendingDown} label="Points lost" active={active === "why_points"} expanded={expanded} disabled={!resultsEnabled} onClick={(event) => pick("why_points", event)} />
        <NavRow
          icon={ListChecks}
          label={resultsEnabled ? `Findings (${findingsCount})` : "Findings"}
          active={active === "findings"}
          expanded={expanded}
          disabled={!resultsEnabled}
          onClick={(event) => pick("findings", event)}
        />
        <NavRow icon={Clock3} label="Timeline" active={active === "timeline"} expanded={expanded} disabled={!resultsEnabled} onClick={(event) => pick("timeline", event)} />
      </nav>
      <div className="mt-auto flex flex-col gap-1 px-2">
        <NavRow icon={Plus} label="New assessment" expanded={expanded} onClick={onNewAssessment} />
        <NavRow icon={LogOut} label="Sign out" expanded={expanded} onClick={onSignOut} />
      </div>
      </aside>
    </div>
  );
}

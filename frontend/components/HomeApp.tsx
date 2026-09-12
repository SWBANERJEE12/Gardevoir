"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startScan, getScan } from "../lib/api";
import { AuthUser, ScanReport } from "../lib/types";
import { LandingHero } from "./LandingHero";
import { AnalyzingProgress } from "./AnalyzingProgress";
import { AnalystPage, RegionsPage, ScorePage } from "./results/OverviewPages";
import { WhyPointsLost } from "./WhyPointsLost";
import { FindingsTable } from "./FindingsTable";
import { TimelineView } from "./TimelineView";
import { AppSidebar2, type SidebarActive } from "./blocks/app-sidebar-2";
import { clearToken, fetchMe, getToken, logoutRemote, saveAiMemory } from "../lib/auth";
import { greetName, type PageOrigin, type ResultsView } from "../lib/results-nav";
import { SidebarPageTransition } from "./results/SidebarPageTransition";
import { createSphereAnim, SphereCanvas } from "./gardevoir/SphereCanvas";

const DEMO_TARGET_DEFAULT_URL = "octocat/Hello-World";

export function HomeApp() {
  const router = useRouter();
  const animRef = useRef(createSphereAnim({
    phase: "orbit",
    cxFrac: 0.18,
    cyFrac: 0.82,
    rFrac: 0.12,
  }));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [currentScan, setCurrentScan] = useState<ScanReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<ResultsView>("overview-score");
  const [pageOrigin, setPageOrigin] = useState<PageOrigin | null>(null);
  const [revealResults, setRevealResults] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (!currentScan || currentScan.status === "COMPLETED" || currentScan.status === "FAILED") {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const updated = await getScan(currentScan.scan_id);
        if (updated.learned_lessons) saveAiMemory(updated.learned_lessons);
        setCurrentScan(updated);
        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to poll scan status", err);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentScan?.scan_id, currentScan?.status]);

  const handleStarFinished = () => setRevealResults(true);

  const handleStartScan = async (targetUrl: string, authorized: boolean) => {
    try {
      setIsLoading(true);
      setRevealResults(false);
      setActiveView("overview-score");
      const scan = await startScan(targetUrl, authorized);
      if (scan.learned_lessons) saveAiMemory(scan.learned_lessons);
      setCurrentScan(scan);
    } catch (err: any) {
      alert(err.message || "Failed to start assessment");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentScan(null);
    setIsLoading(false);
    setRevealResults(false);
    setActiveView("overview-score");
  };

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02040b]">
        <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Loading…</p>
      </main>
    );
  }

  const isFailed = Boolean(currentScan && currentScan.status === "FAILED");
  const isCompleted = Boolean(currentScan && currentScan.status === "COMPLETED" && revealResults);
  const showAnalyzing =
    (isLoading && !currentScan) ||
    Boolean(currentScan && currentScan.status !== "FAILED" && !isCompleted);
  const firstName = greetName(user.name, user.email);
  const sidebarActive: SidebarActive = isCompleted ? activeView : "assess";

  const signOut = () => {
    logoutRemote();
    clearToken();
    router.push("/");
  };

  const selectView = (view: ResultsView, origin?: PageOrigin | null) => {
    if (origin) setPageOrigin(origin);
    setActiveView(view);
  };

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#02040b]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <SphereCanvas
        animRef={animRef}
        interactive={false}
        style={{ zIndex: 0, pointerEvents: "none", position: "fixed" }}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full gap-4 p-3 sm:p-4">
        <AppSidebar2
          active={sidebarActive}
          resultsEnabled={isCompleted}
          onSelect={selectView}
          findingsCount={currentScan?.findings.length ?? 0}
          onNewAssessment={handleReset}
          onSignOut={signOut}
        />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {isCompleted && currentScan ? (
            <SidebarPageTransition pageKey={activeView} origin={pageOrigin}>
              <div className="flex h-full min-h-0 flex-col">
                <div className="px-2 pb-4 pt-2 sm:px-4 sm:pt-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Hey {firstName}!
                  </h1>
                  <p className="mt-2 truncate text-sm text-white/40">{currentScan.target_url}</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-8 sm:px-4">
                  {activeView === "overview-score" && (
                    <ScorePage scan={currentScan} onWhyPoints={() => selectView("why_points")} />
                  )}
                  {activeView === "overview-regions" && <RegionsPage scan={currentScan} />}
                  {activeView === "overview-analyst" && <AnalystPage scan={currentScan} />}
                  {activeView === "why_points" && currentScan.scoring && (
                    <WhyPointsLost
                      penalties={currentScan.scoring.penalties}
                      totalPointsLost={currentScan.scoring.total_points_lost}
                      overallScore={currentScan.scoring.overall_score}
                      onViewFinding={() => selectView("findings")}
                    />
                  )}
                  {activeView === "findings" && <FindingsTable findings={currentScan.findings} />}
                  {activeView === "timeline" && <TimelineView timeline={currentScan.timeline} />}
                </div>
              </div>
            </SidebarPageTransition>
          ) : (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="px-2 pb-2 pt-2 sm:px-4 sm:pt-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Hey {firstName}!
                </h1>
              </div>
              <div className="min-h-0 flex-1 px-2 pb-8 sm:px-4">
                {isFailed && currentScan ? (
                  <div className="lg lg-static mx-auto mt-8 max-w-md p-8 text-center" style={{ borderRadius: 24 }}>
                    <h3 className="font-black text-2xl">Assessment failed</h3>
                    <p className="mt-2 text-sm text-white/50">{currentScan.current_step}</p>
                    <button onClick={handleReset} className="lg mt-4 px-5 py-2 uppercase" style={{ letterSpacing: "0.16em", fontSize: "0.62rem", borderRadius: 999 }}>
                      Try again
                    </button>
                  </div>
                ) : showAnalyzing ? (
                  <AnalyzingProgress
                    scan={
                      currentScan ?? {
                        scan_id: "pending",
                        target_url: "",
                        status: "PENDING",
                        created_at: "",
                        tests_completed: [],
                        test_results: {},
                        findings: [],
                        timeline: [],
                        current_step: "Initializing…",
                      }
                    }
                    onFinished={handleStarFinished}
                  />
                ) : (
                  <LandingHero onStartScan={handleStartScan} isLoading={isLoading} demoTargetUrl={DEMO_TARGET_DEFAULT_URL} />
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

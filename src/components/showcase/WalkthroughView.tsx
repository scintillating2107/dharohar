"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GovFooter, GovHeader } from "@/components/layout/GovBranding";
import { PageTitle } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import type { RecordDetail } from "@/components/records/Record360";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDate, cn } from "@/lib/utils";
import { History, LogIn, Maximize2, Minimize2 } from "lucide-react";
import { INTRO, StepFooter, StepHeader, StepNotes, StepPanel, StepRail, TourIntro, parseStep, useStepKeys, useTour } from "./ShowcaseStage";
import { SnapshotContext, type ShowcaseSnapshot } from "./snapshot";
import snapshotJson from "./snapshot.json";

const snapshot = snapshotJson as unknown as ShowcaseSnapshot;

/**
 * Public, sign-in-free walkthrough of the workflow. Renders the same panels as the in-app demo
 * from a snapshot of a real processed record, so it works on any deployment (no database needed).
 */
export function WalkthroughView() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const step = parseStep(params.get("step"));
  const detail = snapshot.detail as RecordDetail;

  const goStep = useCallback((n: number) => router.replace(`/walkthrough?step=${n + 1}`, { scroll: false }), [router]);
  useStepKeys(step, goStep);
  const tour = useTour(step, goStep);
  const play = () => {
    if (step === INTRO) goStep(0);
    tour.setPlaying(true);
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", onChange);
    return () => window.document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (window.document.fullscreenElement) void window.document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  return (
    <SnapshotContext.Provider value={snapshot}>
      <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
        <GovHeader />
        <main ref={rootRef} className={cn("flex-1 w-full max-w-[1500px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-5", fullscreen && "h-screen max-w-none overflow-y-auto bg-[var(--gov-bg)]")}>
          <PageTitle
            title="Workflow demo"
            description="A guided tour of the digitization pipeline on a real document — every screen shows live data from the system."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-pressed={fullscreen}>
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} {t(fullscreen ? "Exit presenter mode" : "Presenter mode")}
                </Button>
                <Link href="/login">
                  <Button size="sm">
                    <LogIn className="h-4 w-4" /> {t("Sign in to run it live")}
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="flex items-start gap-2 rounded-lg border border-[var(--gov-border-light)] bg-white px-4 py-2.5 text-sm text-[var(--gov-text-muted)]">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gov-navy-light)]" />
            <span>
              {t("Recorded from a real run of the system on {date}. Every value shown is the system’s own output for this scan.", {
                date: formatDate(snapshot.exportedAt),
              })}
            </span>
          </div>

          <StepRail step={step} onStep={goStep} playing={tour.playing} onTogglePlay={() => (tour.playing ? tour.setPlaying(false) : play())} seconds={tour.seconds} />

          {step === INTRO ? (
            <TourIntro detail={detail} settings={snapshot.settings} qrSrc={snapshot.qr} onStep={goStep} onPlay={play} />
          ) : (
            <>
              <StepHeader step={step} detail={detail} settings={snapshot.settings} chainChecked={snapshot.chain.checked} />
              <section aria-live="polite" className="min-w-0">
                <StepPanel step={step} detail={detail} settings={snapshot.settings} />
              </section>
              <StepNotes step={step} />
            </>
          )}

          <StepFooter step={step} onStep={goStep} />
        </main>
        <GovFooter />
      </div>
    </SnapshotContext.Provider>
  );
}

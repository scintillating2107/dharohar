"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RecordStatusBadge } from "@/components/ui/StatusBadges";
import type { RecordDetail } from "@/components/records/Record360";
import { useLocale } from "@/contexts/LocaleContext";
import { cn, formatArea } from "@/lib/utils";
import type { SystemSettings } from "@/types";
import { ArrowRight, ChevronLeft, ChevronRight, Flag, Pause, Play, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { SHOWCASE_STEPS } from "./content";
import { stepMetrics, type Metric } from "./metrics";
import { EnhancementPanel, OcrPanel, SchemaPanel, ValidationPanel } from "./PanelsPipeline";
import { ConfidencePanel, GisPanel, LedgerPanel, VerificationPanel } from "./PanelsTrust";

/** Step index: -1 is the cover screen, 0…7 the workflow stages. URL `?step=0` is the cover. */
export const INTRO = -1;
export const LAST_STEP = SHOWCASE_STEPS.length - 1;
export function parseStep(param: string | null): number {
  const n = Number(param ?? 0) - 1;
  return Number.isFinite(n) ? Math.min(LAST_STEP, Math.max(INTRO, Math.round(n))) : INTRO;
}

/** Seconds each stage stays on screen during the automatic tour. */
const TOUR_SECONDS = 14;
const INTRO_SECONDS = 7;

/** ← / → move between steps (ignored while typing). */
export function useStepKeys(step: number, onStep: (step: number) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "ArrowRight" && step < LAST_STEP) onStep(step + 1);
      if (e.key === "ArrowLeft" && step > INTRO) onStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, step]);
}

/** Automatic tour: advances after a fixed time per step; stops at the last stage. */
export function useTour(step: number, onStep: (step: number) => void) {
  const [playing, setPlaying] = useState(false);
  const seconds = step === INTRO ? INTRO_SECONDS : TOUR_SECONDS;
  useEffect(() => {
    if (!playing) return;
    if (step >= LAST_STEP) {
      const stop = setTimeout(() => setPlaying(false), seconds * 1000);
      return () => clearTimeout(stop);
    }
    const timer = setTimeout(() => onStep(step + 1), seconds * 1000);
    return () => clearTimeout(timer);
  }, [playing, step, onStep, seconds]);
  return { playing, setPlaying, seconds };
}

/** Animated number (respects reduced motion). */
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = reduced ? 1 : Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(origin + (value - origin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toFixed(decimals)}</>;
}

function MetricTile({ metric, index }: { metric: Metric; index: number }) {
  const { t } = useLocale();
  const tone = { navy: "text-[var(--gov-navy)]", green: "text-[var(--gov-green)]", amber: "text-amber-600", red: "text-red-600" }[metric.tone ?? "navy"];
  return (
    <div className="dh-pop rounded-xl border border-[var(--gov-border-light)] bg-white px-4 py-3 shadow-sm" style={{ animationDelay: `${120 + index * 110}ms` }}>
      <p className={cn("text-2xl font-bold leading-tight tabular-nums break-words", tone)}>
        {metric.prefix}
        {typeof metric.value === "number" ? <CountUp value={metric.value} decimals={metric.decimals} /> : t(metric.value)}
        {metric.suffix && <span className="text-base font-semibold opacity-70">{metric.suffix}</span>}
      </p>
      <p className="mt-0.5 text-xs text-[var(--gov-text-muted)]">{t(metric.label)}</p>
    </div>
  );
}

export function StepRail({ step, onStep, playing, onTogglePlay, seconds }: { step: number; onStep: (step: number) => void; playing: boolean; onTogglePlay: () => void; seconds: number }) {
  const { t } = useLocale();
  const progress = ((step + 1) / (SHOWCASE_STEPS.length)) * 100;
  return (
    <div className="gov-card px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant={playing ? "outline" : "primary"} onClick={onTogglePlay} aria-pressed={playing} className="shrink-0">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} <span className="hidden sm:inline">{t(playing ? "Pause tour" : "Play tour")}</span>
        </Button>
        <nav aria-label={t("Workflow steps")} className="min-w-0 flex-1 overflow-x-auto">
          <ol className="flex min-w-max items-center gap-1">
            <li>
              <button
                type="button"
                onClick={() => onStep(INTRO)}
                aria-current={step === INTRO ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  step === INTRO ? "border-[var(--gov-navy)] bg-[var(--gov-navy)] text-white shadow" : "border-[var(--gov-saffron)] bg-orange-50 text-[var(--gov-navy)]"
                )}
              >
                <Flag className="h-3.5 w-3.5" /> {t("Start")}
              </button>
            </li>
            {SHOWCASE_STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const state = i === step ? "current" : i < step ? "done" : "todo";
              return (
                <li key={s.key} className="flex items-center gap-1">
                  <span className={cn("h-0.5 w-3 sm:w-5", i <= step ? "bg-[var(--gov-saffron)]" : "bg-[var(--gov-border)]")} />
                  <button
                    type="button"
                    onClick={() => onStep(i)}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      state === "current" && "border-[var(--gov-navy)] bg-[var(--gov-navy)] text-white shadow",
                      state === "done" && "border-[var(--gov-saffron)] bg-orange-50 text-[var(--gov-navy)]",
                      state === "todo" && "border-[var(--gov-border)] bg-white text-[var(--gov-text-muted)] hover:border-[var(--gov-navy)]"
                    )}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                    <span>
                      {i + 1}. {t(s.short)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--gov-border-light)]" aria-hidden="true">
        {playing ? (
          <div key={`${step}-play`} className="dh-progress h-full bg-[var(--gov-saffron)]" style={{ animationDuration: `${seconds}s` }} />
        ) : (
          <div className="h-full bg-[var(--gov-saffron)] transition-[width] duration-500" style={{ width: `${Math.max(0, progress)}%` }} />
        )}
      </div>
    </div>
  );
}

/** Title, tagline and the step's three headline results. */
export function StepHeader({ step, detail, settings, chainChecked }: { step: number; detail: RecordDetail; settings: SystemSettings | null; chainChecked?: number }) {
  const { t } = useLocale();
  const current = SHOWCASE_STEPS[step];
  const Icon = current.icon;
  const metrics = stepMetrics(current.key, detail, settings, chainChecked);
  return (
    <div key={step} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center">
      <div className="dh-in flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gov-navy)] to-[var(--gov-navy-light)] text-white shadow">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gov-saffron)]">{t("Step {n} of {total}", { n: step + 1, total: SHOWCASE_STEPS.length })}</p>
          <h2 className="text-xl font-bold leading-tight text-[var(--gov-navy)] sm:text-2xl">{t(current.title)}</h2>
          <p className="mt-1 text-sm text-[var(--gov-text-muted)]">{t(current.tagline)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {metrics.map((m, i) => (
          <MetricTile key={m.label} metric={m} index={i} />
        ))}
      </div>
    </div>
  );
}

/** Talking points and technology for the presenter, below the visual. */
export function StepNotes({ step }: { step: number }) {
  const { t } = useLocale();
  const current = SHOWCASE_STEPS[step];
  return (
    <details open className="gov-card group">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-semibold text-[var(--gov-navy)]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-1 rounded-full bg-[var(--gov-saffron)]" /> {t("How it works")}
        </span>
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="grid gap-4 border-t border-[var(--gov-border-light)] px-5 py-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <ul className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
          {current.points.map((p, i) => (
            <li key={p} className="dh-in flex gap-2 text-sm text-[var(--gov-text-muted)]" style={{ animationDelay: `${i * 80}ms` }}>
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gov-saffron)]" />
              <span>{t(p)}</span>
            </li>
          ))}
        </ul>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--gov-text-muted)]">{t("Technology")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {current.tech.map((x) => (
              <span key={x} className="rounded-md border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] px-2 py-0.5 text-xs text-[var(--gov-navy)]">
                {t(x)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

/** The live artefact for a step, rendered from a record's stored results. */
export function StepPanel({ step, detail, settings, onChanged }: { step: number; detail: RecordDetail; settings: SystemSettings | null; onChanged?: () => void }) {
  const key = SHOWCASE_STEPS[step].key;
  const panel = (() => {
    switch (key) {
      case "enhance":
        return <EnhancementPanel document={detail.document!} />;
      case "ocr":
        return <OcrPanel detail={detail} />;
      case "schema":
        return <SchemaPanel detail={detail} />;
      case "validate":
        return <ValidationPanel detail={detail} />;
      case "confidence":
        return <ConfidencePanel detail={detail} settings={settings} />;
      case "verify":
        return <VerificationPanel detail={detail} />;
      case "gis":
        return <GisPanel detail={detail} settings={settings} onChanged={onChanged ?? (() => undefined)} />;
      case "ledger":
        return <LedgerPanel detail={detail} />;
    }
  })();
  return (
    <div key={step} className="dh-in" style={{ animationDelay: "120ms" }}>
      {panel}
    </div>
  );
}

/** Cover screen: the input scan, the certified output, and the eight stages in between. */
export function TourIntro({
  detail,
  settings,
  qrSrc,
  onStep,
  onPlay,
}: {
  detail: RecordDetail;
  settings: SystemSettings | null;
  qrSrc?: string | null;
  onStep: (step: number) => void;
  onPlay: () => void;
}) {
  const { t } = useLocale();
  const { record } = detail;
  const page = detail.document?.pages[0];
  const owner = record.owners?.length ? record.owners.map((o) => o.name).join(", ") : record.owner_name;

  return (
    <div className="space-y-6">
      <div className="dh-in overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--gov-navy)] via-[#16365f] to-[var(--gov-navy-light)] p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gov-saffron)]">{t("Dharohar · land record digitization")}</p>
        <h2 className="mt-2 max-w-3xl text-2xl font-bold leading-tight sm:text-4xl">{t("From a faded register to a signed, mapped land record")}</h2>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">{t("Follow one real khatauni through all eight stages — every number on these screens is the system’s own output for this scan.")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => onStep(0)} className="bg-[var(--gov-saffron)] text-[var(--gov-navy)] hover:bg-orange-400">
            {t("Start the tour")} <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onPlay} className="border-white/40 bg-white/10 text-white hover:bg-white/20">
            <Play className="h-4 w-4" /> {t("Play automatically")}
          </Button>
        </div>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
        <div className="dh-in gov-card overflow-hidden" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 border-b border-[var(--gov-border-light)] px-4 py-2.5 text-sm font-semibold text-[var(--gov-navy)]">
            <ScanLine className="h-4 w-4 text-[var(--gov-saffron)]" /> {t("Input: the scanned register")}
          </div>
          {page?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.imageUrl} alt={t("Original scan")} className="h-[300px] w-full object-cover object-top" />
          )}
        </div>

        <div className="flex flex-row items-center justify-center gap-3 lg:flex-col" aria-hidden="true">
          <span className="dh-flow h-0.5 w-16 lg:w-full" />
          <span className="dh-pop rounded-full bg-[var(--gov-saffron)] px-3 py-1 text-xs font-bold text-[var(--gov-navy)] shadow" style={{ animationDelay: "300ms" }}>
            {t("8 stages")}
          </span>
          <span className="dh-flow h-0.5 w-16 lg:w-full" />
        </div>

        <div className="dh-in gov-card overflow-hidden" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--gov-border-light)] px-4 py-2.5 text-sm font-semibold text-[var(--gov-navy)]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--gov-green)]" /> {t("Output: a verified, signed record")}
            </span>
            <RecordStatusBadge status={record.status} />
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div className="col-span-2">
                <dt className="text-xs text-[var(--gov-text-muted)]">{t("Owner(s)")}</dt>
                <dd className="text-lg font-bold text-[var(--gov-navy)]">{owner}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--gov-text-muted)]">{t("Khasra (plot) no.")}</dt>
                <dd className="font-semibold">{record.khasra_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--gov-text-muted)]">{t("Khata no.")}</dt>
                <dd className="font-semibold">{record.khata_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--gov-text-muted)]">{t("Area")}</dt>
                <dd className="font-semibold">{formatArea(record.area, record.area_unit)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--gov-text-muted)]">{t("Village")}</dt>
                <dd className="font-semibold">{t(record.village)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-[var(--gov-text-muted)]">{t("Record hash (SHA-256)")}</dt>
                <dd className="font-mono text-[11px] break-all text-[var(--gov-green)]">{record.certificate?.record_hash ?? "—"}</dd>
              </div>
            </dl>
            {record.certificate && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc ?? `/api/public/qr/${record.record_id}`} alt={t("Verification QR code")} className="mx-auto h-28 w-28" />
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--gov-navy)]">{t("The eight stages — click any to jump in")}</p>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHOWCASE_STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const headline = stepMetrics(s.key, detail, settings)[0];
            return (
              <li key={s.key} className="dh-in" style={{ animationDelay: `${300 + i * 70}ms` }}>
                <button
                  type="button"
                  onClick={() => onStep(i)}
                  className="group flex h-full w-full items-start gap-3 rounded-xl border border-[var(--gov-border-light)] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--gov-navy-light)] hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gov-bg-subtle)] text-[var(--gov-navy)] transition group-hover:bg-[var(--gov-navy)] group-hover:text-white">
                    <StepIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-[var(--gov-saffron)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="block font-semibold leading-tight text-[var(--gov-navy)]">{t(s.title)}</span>
                    <span className="mt-1 block text-xs text-[var(--gov-text-muted)]">
                      <strong className="text-[var(--gov-navy)]">
                        {headline.prefix}
                        {typeof headline.value === "number" ? headline.value : t(headline.value)}
                        {headline.suffix}
                      </strong>{" "}
                      {t(headline.label).toLowerCase()}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function StepFooter({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const { t } = useLocale();
  const prevLabel = step > 0 ? t(SHOWCASE_STEPS[step - 1].short) : t("Start");
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--gov-border-light)] pt-4">
      <Button variant="outline" onClick={() => onStep(step - 1)} disabled={step === INTRO}>
        <ChevronLeft className="h-4 w-4" /> {step === INTRO ? t("Previous") : prevLabel}
      </Button>
      <p className="hidden sm:block text-xs text-[var(--gov-text-muted)]">{t("Use ← → keys to move between steps")}</p>
      <Button onClick={() => onStep(step + 1)} disabled={step === LAST_STEP}>
        {step < LAST_STEP ? t(SHOWCASE_STEPS[step + 1].short) : t("Next")} <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { RecordDetail } from "@/components/records/Record360";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import type { Document, SystemSettings } from "@/types";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { SHOWCASE_STEPS } from "./content";
import { EnhancementPanel, OcrPanel, SchemaPanel, ValidationPanel } from "./PanelsPipeline";
import { ConfidencePanel, GisPanel, LedgerPanel, VerificationPanel } from "./PanelsTrust";

/** ← / → move between steps (ignored while typing). */
export function useStepKeys(step: number, onStep: (step: number) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "ArrowRight" && step < SHOWCASE_STEPS.length - 1) onStep(step + 1);
      if (e.key === "ArrowLeft" && step > 0) onStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, step]);
}

export function StepRail({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const { t } = useLocale();
  return (
    <nav aria-label={t("Workflow steps")} className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {SHOWCASE_STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const state = i === step ? "current" : i < step ? "done" : "todo";
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 && <span className={cn("h-0.5 w-4 sm:w-6", i <= step ? "bg-[var(--gov-saffron)]" : "bg-[var(--gov-border)]")} />}
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
  );
}

export function StepNarration({ step, document }: { step: number; document?: Document | null }) {
  const { t } = useLocale();
  const current = SHOWCASE_STEPS[step];
  const Icon = current.icon;
  return (
    <aside className="gov-card p-5 min-[1700px]:sticky min-[1700px]:top-[76px]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gov-navy)] text-white">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gov-saffron)]">
            {t("Step {n} of {total}", { n: step + 1, total: SHOWCASE_STEPS.length })}
          </p>
          <h2 className="text-lg font-bold leading-tight text-[var(--gov-navy)]">{t(current.title)}</h2>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--gov-text)]">{t(current.tagline)}</p>
      <ul className="mt-4 grid gap-x-6 gap-y-2.5 md:grid-cols-2 min-[1700px]:grid-cols-1">
        {current.points.map((p) => (
          <li key={p} className="flex gap-2 text-sm text-[var(--gov-text-muted)]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gov-saffron)]" />
            <span>{t(p)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-[var(--gov-text-muted)]">{t("Technology")}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {current.tech.map((x) => (
          <span key={x} className="rounded-md border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] px-2 py-0.5 text-xs text-[var(--gov-navy)]">
            {t(x)}
          </span>
        ))}
      </div>
      {document && (
        <div className="mt-5 border-t border-[var(--gov-border-light)] pt-3 text-xs text-[var(--gov-text-muted)]">
          <p className="font-semibold text-[var(--gov-navy)] break-words">{document.name}</p>
          <p className="font-mono">
            {document.id}
            {document.recordId ? ` · ${document.recordId}` : ""}
          </p>
        </div>
      )}
    </aside>
  );
}

/** The live artefact for a step, rendered from a record's stored results. */
export function StepPanel({ step, detail, settings, onChanged }: { step: number; detail: RecordDetail; settings: SystemSettings | null; onChanged?: () => void }) {
  const key = SHOWCASE_STEPS[step].key;
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
}

export function StepFooter({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--gov-border-light)] pt-4">
      <Button variant="outline" onClick={() => onStep(step - 1)} disabled={step === 0}>
        <ChevronLeft className="h-4 w-4" /> {step > 0 ? t(SHOWCASE_STEPS[step - 1].short) : t("Previous")}
      </Button>
      <p className="hidden sm:block text-xs text-[var(--gov-text-muted)]">{t("Use ← → keys to move between steps")}</p>
      <Button onClick={() => onStep(step + 1)} disabled={step === SHOWCASE_STEPS.length - 1}>
        {step < SHOWCASE_STEPS.length - 1 ? t(SHOWCASE_STEPS[step + 1].short) : t("Next")} <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

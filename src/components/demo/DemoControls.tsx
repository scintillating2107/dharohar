"use client";

import { DEMO_LAST_STEP_INDEX, DEMO_STEP_LABELS } from "@/lib/demo-workflow";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DemoControls({
  stepIndex,
  continueDisabled,
  continueHint,
  onPrev,
  onNext,
  onStepClick,
}: {
  stepIndex: number;
  continueDisabled?: boolean;
  continueHint?: string;
  onPrev: () => void;
  onNext: () => void;
  onStepClick: (i: number) => void;
}) {
  const label = DEMO_STEP_LABELS[stepIndex] ?? "Step";
  const atEnd = stepIndex >= DEMO_LAST_STEP_INDEX;

  return (
    <div className="border-t border-[var(--gov-border-light)] bg-white px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--gov-text-muted)]">
          Step <span className="font-semibold text-[var(--gov-navy)]">{stepIndex + 1}</span> of{" "}
          {DEMO_LAST_STEP_INDEX + 1}
          <span className="mx-2 text-[var(--gov-border)]">·</span>
          <span className="font-medium text-[var(--gov-navy)]">{label}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev} disabled={stepIndex === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button size="sm" onClick={onNext} disabled={atEnd || continueDisabled}>
            {atEnd ? "Finished" : "Continue"}
            {!atEnd && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {continueHint && (
        <p className="text-center text-xs text-amber-700 font-medium">{continueHint}</p>
      )}

      <div className="flex flex-wrap justify-center gap-1.5">
        {DEMO_STEP_LABELS.map((stepLabel, i) => (
          <button
            key={stepLabel}
            type="button"
            onClick={() => onStepClick(i)}
            className={cn(
              "text-xs rounded-md px-2 py-1 border font-medium transition-colors",
              i === stepIndex
                ? "bg-[var(--gov-navy)] text-white border-[var(--gov-navy)]"
                : i < stepIndex
                  ? "border-[var(--gov-green)]/40 text-[var(--gov-green)] bg-green-50/50 hover:bg-green-50"
                  : "border-[var(--gov-border)] text-[var(--gov-text-muted)] hover:bg-[var(--gov-bg)]"
            )}
          >
            {stepLabel}
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-[var(--gov-text-light)]">
        Use Continue or a step name to move — nothing plays automatically.
      </p>
    </div>
  );
}

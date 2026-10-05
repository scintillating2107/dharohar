"use client";

import type { ProcessingStep } from "@/types";
import { Check, Circle, Loader2, Minus, X } from "lucide-react";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

const ICONS: Record<ProcessingStep["status"], React.ReactNode> = {
  completed: <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />,
  failed: <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />,
  pending: <Circle className="h-2.5 w-2.5 text-[var(--gov-text-light)]" />,
  skipped: <Minus className="h-3.5 w-3.5 text-[var(--gov-text-muted)]" />,
};

const BG: Record<ProcessingStep["status"], string> = {
  completed: "bg-[var(--gov-green)]",
  in_progress: "bg-[var(--gov-navy-light)]",
  failed: "bg-red-600",
  pending: "bg-[var(--gov-border-light)] border-2 border-[var(--gov-border)]",
  skipped: "bg-[var(--gov-border-light)]",
};

const STATUS_TEXT: Record<ProcessingStep["status"], string> = {
  completed: "Completed",
  in_progress: "In progress…",
  failed: "Failed",
  pending: "Pending",
  skipped: "Skipped",
};

export function ProcessingTimeline({ steps }: { steps: ProcessingStep[] }) {
  const { t, tx } = useLocale();
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", BG[step.status])} aria-hidden="true">
              {ICONS[step.status]}
            </div>
            {index < steps.length - 1 && (
              <div className={cn("w-0.5 flex-1 min-h-[28px]", step.status === "completed" ? "bg-[var(--gov-green)]/40" : "bg-[var(--gov-border-light)]")} />
            )}
          </div>
          <div className="pb-5 pt-0.5 min-w-0">
            <p className={cn("text-sm font-semibold", step.status === "pending" ? "text-[var(--gov-text-light)]" : "text-[var(--gov-navy)]")}>
              {t(step.label)}
              <span className="sr-only"> — {t(STATUS_TEXT[step.status])}</span>
              {step.durationMs !== undefined && step.status === "completed" && (
                <span className="ml-2 text-xs font-normal text-[var(--gov-text-muted)]">{formatDuration(step.durationMs)}</span>
              )}
            </p>
            {step.detail && <p className="text-xs text-[var(--gov-text-muted)] mt-0.5 break-words">{tx(step.detail)}</p>}
            {step.status === "in_progress" && <p className="text-xs text-[var(--gov-navy-light)] mt-0.5 font-medium">{t("In progress…")}</p>}
            {step.completedAt && step.status === "completed" && !step.detail && (
              <p className="text-xs text-[var(--gov-text-muted)] mt-0.5">{formatDate(step.completedAt)}</p>
            )}
            {step.error && <p className="text-xs text-red-700 mt-1 bg-red-50 rounded px-2 py-1 inline-block break-words">{tx(step.error)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

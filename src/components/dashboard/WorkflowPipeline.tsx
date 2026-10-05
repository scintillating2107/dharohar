"use client";

import { PROCESSING_STEPS } from "@/lib/config";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function WorkflowPipeline({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  const steps = [
    { label: "Upload", type: "done" },
    { label: "Understand", type: "auto" },
    { label: "Extract", type: "auto" },
    { label: "Validate", type: "auto" },
    { label: "Verify", type: "review" },
    { label: "Map", type: "final" },
    { label: "Certify", type: "final" },
    { label: "Audit", type: "final" },
  ] as const;

  const stepStyles = {
    done: "bg-[var(--gov-navy)]/8 border-[var(--gov-navy)]/20 text-[var(--gov-navy)]",
    auto: "bg-blue-50 border-blue-200 text-[var(--gov-navy-light)]",
    review: "bg-amber-50 border-amber-200 text-amber-800",
    final: "bg-green-50 border-green-200 text-[var(--gov-green)]",
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {steps.map((step, i) => (
          <span key={step.label} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="h-3 w-3 text-[var(--gov-border)]" />}
            <span className={cn("rounded px-2 py-0.5 border text-[11px] font-medium", stepStyles[step.type])}>
              {t(step.label)}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="gov-card overflow-hidden">
      <div className="gov-card-header">
        <h3 className="text-sm font-semibold text-[var(--gov-navy)] flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-[var(--gov-saffron)] rounded-full" />
          {t("Digitization pipeline")}
        </h3>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-[var(--gov-border)] flex-shrink-0" />}
              <div className={cn("rounded-md px-3 py-2 text-xs font-semibold border", stepStyles[step.type])}>
                {t(step.label)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--gov-text-muted)] border-t border-[var(--gov-border-light)] pt-3">
          {t("{n} steps — computer vision, multilingual OCR/NLP, validation, and human verification before LRMS/GIS storage", { n: PROCESSING_STEPS.length })}
        </p>
      </div>
    </div>
  );
}

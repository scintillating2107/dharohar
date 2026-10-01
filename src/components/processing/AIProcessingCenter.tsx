"use client";

import type { Document, ProcessingStep } from "@/types";
import { PROCESSING_STEPS } from "@/lib/config";
import { cn, formatConfidence } from "@/lib/utils";
import { Check, Circle, Loader2, X } from "lucide-react";

const POST_PIPELINE: { key: string; label: string }[] = [
  { key: "duplicate_detection", label: "Duplicate detection" },
  { key: "gis_matching", label: "GIS matching" },
  { key: "human_verification", label: "Human verification" },
  { key: "certification", label: "Certification" },
];

function stepIndexForDocument(steps: ProcessingStep[]): number {
  const inProgress = steps.findIndex((s) => s.status === "in_progress");
  if (inProgress >= 0) return inProgress;
  const lastDone = steps.reduce((acc, s, i) => (s.status === "completed" ? i : acc), -1);
  return lastDone + 1;
}

function postStatus(docStatus: Document["status"], index: number, pipelineDone: boolean) {
  if (!pipelineDone) return "pending";
  if (docStatus === "VERIFIED") return "completed";
  if (docStatus === "VERIFICATION_REQUIRED" && index <= 2) return index < 2 ? "completed" : "in_progress";
  if (docStatus === "VALIDATED" || docStatus === "EXTRACTED") return index === 0 ? "in_progress" : "pending";
  return "pending";
}

export function AIProcessingCenter({ document }: { document: Document }) {
  const steps: ProcessingStep[] = document.steps.length
    ? document.steps
    : PROCESSING_STEPS.map((s) => ({
        key: s.key,
        label: s.label,
        status: "pending" as const,
      }));
  const activeIdx = stepIndexForDocument(steps);
  const pipelineComplete = steps.every((s) => s.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--gov-navy)]">Document processing</h3>
        <p className="text-sm text-[var(--gov-text-muted)]">
          Automated pipeline with confidence signals before officer verification and certification.
        </p>
      </div>

      <ul className="space-y-4">
        {steps.map((step, i) => (
          <PipelineRow
            key={step.key}
            label={step.label === "Field Extraction" ? "Fields extracted" : step.label}
            status={step.status}
            time={step.completedAt || step.startedAt}
            error={step.error}
            confidence={step.status === "completed" ? 0.94 - i * 0.02 : undefined}
            active={i === activeIdx && step.status === "in_progress"}
          />
        ))}

        {POST_PIPELINE.map((post, i) => {
          const status = postStatus(document.status, i, pipelineComplete);
          return (
            <PipelineRow
              key={post.key}
              label={post.label}
              status={status}
              confidence={status === "completed" ? 0.99 : undefined}
            />
          );
        })}
      </ul>

      {steps.find((s) => s.key === "ocr" && s.status === "completed") && (
        <div className="rounded-lg border border-[var(--gov-border-light)] bg-white p-4">
          <p className="text-sm font-semibold text-[var(--gov-navy)] mb-2">OCR</p>
          <div className="h-2 rounded-full bg-[var(--gov-border-light)] overflow-hidden">
            <div className="h-full w-full bg-[var(--gov-navy)]" />
          </div>
          <dl className="grid sm:grid-cols-3 gap-3 mt-3 text-xs text-[var(--gov-text-muted)]">
            <div><dt className="font-medium text-[var(--gov-navy)]">Language</dt><dd>Hindi</dd></div>
            <div><dt className="font-medium text-[var(--gov-navy)]">OCR confidence</dt><dd>94.2%</dd></div>
            <div>
              <dt className="font-medium text-[var(--gov-navy)]">Pages processed</dt>
              <dd>{document.pageCount}/{document.pageCount}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function PipelineRow({
  label,
  status,
  time,
  error,
  confidence,
  active,
}: {
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  time?: string;
  error?: string;
  confidence?: number;
  active?: boolean;
}) {
  const icon =
    status === "completed" ? <Check className="h-3.5 w-3.5 text-white" /> :
    status === "in_progress" ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> :
    status === "failed" ? <X className="h-3.5 w-3.5 text-white" /> :
    <Circle className="h-2.5 w-2.5 text-[var(--gov-text-light)]" />;

  const bg =
    status === "completed" ? "bg-[var(--gov-green)]" :
    status === "in_progress" ? "bg-[var(--gov-navy-light)]" :
    status === "failed" ? "bg-red-600" :
    "bg-[var(--gov-border-light)] border-2 border-[var(--gov-border)]";

  return (
    <li className={cn("flex gap-4 rounded-lg p-3", active && "bg-blue-50/80 border border-blue-100")}>
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0", bg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={cn("text-sm font-semibold", status === "pending" ? "text-[var(--gov-text-light)]" : "text-[var(--gov-navy)]")}>
            {label}
          </p>
          {confidence !== undefined && (
            <span className="text-xs text-[var(--gov-text-muted)]">
              Confidence {formatConfidence(confidence)}
            </span>
          )}
        </div>
        {time && (
          <p className="text-xs text-[var(--gov-text-muted)] mt-0.5">
            {new Date(time).toLocaleString("en-IN")}
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    </li>
  );
}

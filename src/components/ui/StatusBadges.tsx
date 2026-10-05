"use client";

import type { ProcessingStatus, RecordStatus, ValidationStatus, FieldSource } from "@/types";
import { Badge } from "./Badge";
import { getConfidenceLevel } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

type Variant = "success" | "warning" | "error" | "info" | "neutral";

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; variant: Variant }> = {
  UPLOADED: { label: "Uploaded", variant: "neutral" },
  QUEUED: { label: "Queued", variant: "info" },
  PROCESSING: { label: "Rendering pages", variant: "info" },
  IMAGE_PROCESSING: { label: "Enhancing", variant: "info" },
  OCR_PROCESSING: { label: "OCR", variant: "info" },
  OCR_COMPLETED: { label: "OCR completed", variant: "info" },
  EXTRACTION_PROCESSING: { label: "Extracting fields", variant: "info" },
  EXTRACTED: { label: "Extracted", variant: "info" },
  VALIDATION_PROCESSING: { label: "Validating", variant: "info" },
  VALIDATED: { label: "Validated", variant: "success" },
  VERIFICATION_REQUIRED: { label: "Needs verification", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "error" },
  FAILED: { label: "Failed", variant: "error" },
};

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  const { t } = useLocale();
  const config = STATUS_CONFIG[status] || { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{t(config.label)}</Badge>;
}

const RECORD_STATUS: Record<RecordStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  EXTRACTED: { label: "Extracted", variant: "info" },
  VERIFICATION_REQUIRED: { label: "Under review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "error" },
};

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  const { t } = useLocale();
  const c = RECORD_STATUS[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={c.variant}>{t(c.label)}</Badge>;
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  const { t } = useLocale();
  const map = {
    VALID: { label: "Valid", variant: "success" as const },
    REVIEW_REQUIRED: { label: "Review required", variant: "warning" as const },
    INVALID: { label: "Invalid", variant: "error" as const },
  };
  const config = map[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{t(config.label)}</Badge>;
}

export function ConfidenceBadge({ confidence, reviewThreshold }: { confidence: number; reviewThreshold?: number }) {
  const { t } = useLocale();
  const level = getConfidenceLevel(confidence, reviewThreshold);
  const variant = level === "high" ? "success" : level === "medium" ? "warning" : "error";
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Needs review";
  return (
    <Badge variant={variant}>
      {Math.round(confidence * 100)}% {t(label)}
    </Badge>
  );
}

const SOURCE_LABEL: Record<FieldSource, string> = {
  gemini: "AI model",
  rules: "Rule-based",
  learned: "Learned correction",
  officer: "Officer",
  metadata: "Upload metadata",
};

export function FieldSourceBadge({ source }: { source?: FieldSource }) {
  const { t } = useLocale();
  if (!source) return null;
  const variant: Variant = source === "officer" ? "success" : source === "metadata" ? "warning" : source === "learned" ? "info" : "neutral";
  return <Badge variant={variant}>{t(SOURCE_LABEL[source])}</Badge>;
}

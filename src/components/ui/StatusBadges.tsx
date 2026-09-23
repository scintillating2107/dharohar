import type { ProcessingStatus } from "@/types";
import { Badge } from "./Badge";

const STATUS_CONFIG: Record<
  ProcessingStatus,
  { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }
> = {
  UPLOADED: { label: "Uploaded", variant: "neutral" },
  PROCESSING: { label: "Processing", variant: "info" },
  IMAGE_PROCESSING: { label: "Image Processing", variant: "info" },
  OCR_PROCESSING: { label: "OCR Processing", variant: "info" },
  OCR_COMPLETED: { label: "OCR Completed", variant: "info" },
  EXTRACTION_PROCESSING: { label: "Extracting Fields", variant: "info" },
  EXTRACTED: { label: "Extracted", variant: "info" },
  VALIDATION_PROCESSING: { label: "Validating", variant: "info" },
  VALIDATED: { label: "Validated", variant: "success" },
  VERIFICATION_REQUIRED: { label: "Needs Verification", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "error" },
  FAILED: { label: "Failed", variant: "error" },
};

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "neutral" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ValidationStatusBadge({
  status,
}: {
  status: "VALID" | "REVIEW_REQUIRED" | "INVALID";
}) {
  const map = {
    VALID: { label: "Valid", variant: "success" as const },
    REVIEW_REQUIRED: { label: "Review Required", variant: "warning" as const },
    INVALID: { label: "Invalid", variant: "error" as const },
  };
  const config = map[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant =
    confidence >= 0.9 ? "success" : confidence >= 0.75 ? "warning" : "error";
  const label =
    confidence >= 0.9 ? "Confident" : confidence >= 0.75 ? "Moderate" : "Needs Review";

  return (
    <Badge variant={variant}>
      {pct}% {label}
    </Badge>
  );
}

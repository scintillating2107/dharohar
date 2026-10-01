export { DEMO_RECORD_ID, DEMO_DOCUMENT_ID } from "@/lib/record-ids";
export const DEMO_DURATION_LABEL = "2 min 30 sec";

export const DEMO_TIMELINE = [
  "ACCOUNT",
  "UPLOAD",
  "PROCESS",
  "OCR",
  "EXTRACT",
  "VALIDATE",
  "VERIFY",
  "GIS",
  "CERTIFY",
] as const;

/** Maps demo step index (0–10) to timeline highlight index */
export function demoStepToTimeline(step: number): number {
  if (step <= 0) return 0;
  if (step === 1) return 1;
  if (step === 2) return 2;
  if (step === 3) return 3;
  if (step === 4) return 4;
  if (step === 5) return 5;
  if (step <= 7) return 6;
  if (step === 8) return 7;
  return 8;
}

export const DEMO_STEP_LABELS = [
  "Sign up",
  "Upload",
  "Enhancement",
  "OCR",
  "Extraction",
  "Validation",
  "Verification",
  "Storage",
  "GIS",
  "Certification",
  "Complete",
];

export const DEMO_LAST_STEP_INDEX = DEMO_STEP_LABELS.length - 1;

export const AUTO_STEP_MS = 12000;

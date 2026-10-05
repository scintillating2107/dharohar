import type { ExtractedFieldValue, Owner } from "@/types";

/** Intermediate pipeline outputs persisted on the document so failed jobs resume mid-way. */
export interface PipelineState {
  language?: {
    code: string;
    source: "declared" | "osd" | "default" | "gemini" | "ocr";
    pages: { page: number; script: string | null; confidence: number; rotated: number }[];
  };
  ocr?: { engine: string; geminiError?: string; handwritten?: boolean };
  extraction?: {
    engine: string;
    fields: Record<string, ExtractedFieldValue>;
    owners: Owner[];
    learnedApplied: string[];
    geminiError?: string;
  };
  reprocessReason?: string;
}

import type { ExtractionResult, OCRResult, ExtractedFieldValue } from "@/types";
import { mockExtractionResult } from "@/mocks/data";
import { extractFieldsLocal, runGeminiExtraction } from "@/lib/member-local";
import { getGeminiApiKey } from "@/lib/gemini-env";
import { callExternal, INTEGRATION_URLS, isMockMode, IntegrationError } from "./client";

function normalizeGeminiFields(
  raw: Record<string, ExtractedFieldValue | null | undefined>
): ExtractionResult["fields"] {
  const fields: ExtractionResult["fields"] = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object" && value.value?.trim()) {
      fields[key] = value;
    }
  }
  return fields;
}

export async function extractFields(
  documentId: string,
  ocrResult?: OCRResult
): Promise<ExtractionResult> {
  if (isMockMode()) {
    await delay(800);
    return mockExtractionResult(documentId);
  }

  if (INTEGRATION_URLS.extraction) {
    try {
      return await callExternal<ExtractionResult>(
        "Field Extraction (Member 4)",
        `${INTEGRATION_URLS.extraction}/extract`,
        { document_id: documentId, ocr: ocrResult }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Member 4 unavailable, using local extraction:", msg);
    }
  }

  const apiKey = getGeminiApiKey();
  if (apiKey && ocrResult?.pages?.length) {
    const ocrText = ocrResult.pages.map((p) => p.text).join("\n").trim();
    if (ocrText) {
      try {
        const gemini = await runGeminiExtraction(documentId, ocrText);
        const fields = normalizeGeminiFields(gemini.fields as Record<string, ExtractedFieldValue | null>);
        if (Object.keys(fields).length > 0) {
          return { document_id: documentId, fields };
        }
      } catch (err) {
        console.error("Member 4 Gemini extraction failed, using rule-based fallback:", err);
      }
    }
  }

  return extractFieldsLocal(documentId, ocrResult);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

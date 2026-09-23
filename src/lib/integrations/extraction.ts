import type { ExtractionResult, OCRResult } from "@/types";
import { mockExtractionResult } from "@/mocks/data";
import { extractFieldsLocal } from "@/lib/services/local";
import { callExternal, INTEGRATION_URLS, isMockMode, IntegrationError } from "./client";

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
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError(
        "Field extraction service unavailable",
        "Field Extraction (Member 4)"
      );
    }
  }

  return extractFieldsLocal(documentId, ocrResult);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

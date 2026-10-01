import type { OCRResult } from "@/types";
import { mockOCRResult } from "@/mocks/data";
import { runGeminiOCRFromDocument } from "@/lib/services/local/ocr";
import { getGeminiApiKey } from "@/lib/gemini-env";
import {
  callExternal,
  INTEGRATION_URLS,
  isMockMode,
  IntegrationError,
} from "./client";

export async function runOCR(
  documentId: string,
  processedImageUrls?: string[]
): Promise<OCRResult> {
  if (isMockMode()) {
    await delay(1000);
    return mockOCRResult(documentId);
  }

  if (INTEGRATION_URLS.ocr) {
    try {
      return await callExternal<OCRResult>(
        "OCR (Member 3)",
        `${INTEGRATION_URLS.ocr}/extract`,
        {
          document_id: documentId,
          images: processedImageUrls,
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Member 3 OCR unavailable, using local OCR:", msg);
    }
  }

  if (getGeminiApiKey()) {
    try {
      return await runGeminiOCRFromDocument(documentId, processedImageUrls);
    } catch (err) {
      console.warn("Gemini OCR failed, using local OCR:", err);
    }
  }

  const { runOCRLocal } = await import("@/lib/services/local/ocr");
  return runOCRLocal(documentId);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

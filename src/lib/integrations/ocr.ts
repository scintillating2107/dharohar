import type { OCRResult } from "@/types";
import { mockOCRResult } from "@/mocks/data";
import { runOCRLocal } from "@/lib/services/local";
import { callExternal, INTEGRATION_URLS, isMockMode, IntegrationError } from "./client";

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
        { document_id: documentId, images: processedImageUrls }
      );
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError("OCR service unavailable", "OCR (Member 3)");
    }
  }

  return runOCRLocal(documentId);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

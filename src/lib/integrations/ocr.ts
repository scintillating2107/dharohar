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
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError("OCR service unavailable", "OCR (Member 3)");
    }
  }

  if (!getGeminiApiKey()) {
    throw new IntegrationError(
      "GEMINI_API_KEY is missing — set it in .env.local for Member 3 OCR",
      "OCR (Member 3)",
      false
    );
  }

  try {
    return await runGeminiOCRFromDocument(documentId, processedImageUrls);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR failed";
    throw new IntegrationError(message, "OCR (Member 3)");
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { ImageProcessingResult } from "@/types";
import { mockImageProcessingResult } from "@/mocks/data";
import { processImagesLocal } from "@/lib/services/local";
import { callExternal, INTEGRATION_URLS, isMockMode, IntegrationError } from "./client";

export async function processImages(
  documentId: string,
  pageCount: number,
  fileReference?: string
): Promise<ImageProcessingResult> {
  if (isMockMode()) {
    await delay(800);
    return mockImageProcessingResult(documentId, pageCount);
  }

  if (INTEGRATION_URLS.imageProcessing) {
    try {
      return await callExternal<ImageProcessingResult>(
        "Image Processing (Member 2)",
        `${INTEGRATION_URLS.imageProcessing}/process`,
        { document_id: documentId, page_count: pageCount, file_reference: fileReference }
      );
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError(
        "Image processing service unavailable",
        "Image Processing (Member 2)"
      );
    }
  }

  return processImagesLocal(documentId, pageCount);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

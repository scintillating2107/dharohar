import type { ImageProcessingResult } from "@/types";
import { store } from "@/lib/store";
import {
  analyzeImageQuality,
  ensurePageImages,
  fileUrl,
  readPageImageBuffer,
} from "@/lib/file-storage";

export async function processImagesLocal(
  documentId: string,
  _pageCount: number
): Promise<ImageProcessingResult> {
  const doc = store.getDocument(documentId);
  if (!doc) throw new Error("Document not found");

  const totalPages = await ensurePageImages(documentId);

  const pages = await Promise.all(
    Array.from({ length: totalPages }, async (_, index) => {
      const page = index + 1;
      const buffer = await readPageImageBuffer(documentId, page);
      if (!buffer) throw new Error(`Page ${page} image missing after rendering`);

      const quality = await analyzeImageQuality(buffer);

      return {
        page,
        processed_image_url: fileUrl(documentId, page, true),
        quality_score: quality.quality_score,
        blur_detected: quality.blur_detected,
        skew_angle: 0,
        rotation_corrected: true,
      };
    })
  );

  return { document_id: documentId, pages };
}

import type { OCRResult } from "@/types";
import { store } from "@/lib/store";
import { ensurePageImages, readPageImageBuffer } from "@/lib/file-storage";
import { recognizeImageBuffer } from "@/lib/ocr-engine";
import { buildRegionsFromExtraction, extractFieldsFromOcrWords } from "@/lib/field-extraction";

export async function runOCRLocal(documentId: string): Promise<OCRResult> {
  const doc = store.getDocument(documentId);
  if (!doc) throw new Error("Document not found");

  const pageCount = await ensurePageImages(documentId);
  const pages = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const buffer = await readPageImageBuffer(documentId, pageNum);
    if (!buffer) throw new Error(`Cannot OCR page ${pageNum}: image not found`);

    const ocr = await recognizeImageBuffer(buffer);
    const fields = extractFieldsFromOcrWords(ocr.text, ocr.words, {
      district: doc.district,
      state: doc.state,
    });
    const regions = buildRegionsFromExtraction(fields, ocr.words);

    pages.push({
      page: pageNum,
      language: ocr.language,
      text: ocr.text || fields.raw_text,
      regions,
    });
  }

  if (pages.every((p) => !p.text.trim())) {
    throw new Error(
      "OCR could not read any text from the document. Upload a clearer scan or higher-resolution file."
    );
  }

  return { document_id: documentId, pages };
}

import type { ExtractionResult, ExtractedFieldValue, OCRResult } from "@/types";
import { store } from "@/lib/store";
import { extractFieldsFromOcrWords } from "@/lib/field-extraction";

function field(value: string | undefined, confidence: number, unit?: string): ExtractedFieldValue | null {
  if (!value?.trim()) return null;
  return {
    value: value.trim(),
    confidence,
    ...(unit ? { unit } : {}),
    ...(confidence < 0.8 ? { needsReview: true } : {}),
  };
}

export async function extractFieldsLocal(
  documentId: string,
  ocrResult?: OCRResult
): Promise<ExtractionResult> {
  const doc = store.getDocument(documentId);
  if (!doc) throw new Error("Document not found");
  if (!ocrResult?.pages?.length) {
    throw new Error("Field extraction requires OCR output from the document");
  }

  const allWords = ocrResult.pages.flatMap((p) =>
    p.regions.map((r) => ({
      text: r.text,
      confidence: r.confidence,
      bbox: r.bbox,
    }))
  );

  const fullText = ocrResult.pages.map((p) => p.text).join("\n");
  const parsed = extractFieldsFromOcrWords(fullText, allWords, {
    district: doc.district,
    state: doc.state,
  });

  const wordConfidence = (label: string | undefined, fallback = 0.5): number => {
    if (!label) return 0;
    const region = ocrResult.pages
      .flatMap((p) => p.regions)
      .find((r) => r.text.toLowerCase().includes(label.toLowerCase()));
    return region?.confidence ?? fallback;
  };

  const candidates: Record<string, ExtractedFieldValue | null> = {
    owner_name: field(parsed.owner_name, wordConfidence(parsed.owner_name, 0.55)),
    father_name: field(parsed.father_name, wordConfidence(parsed.father_name, 0.5)),
    khasra_number: field(parsed.khasra_number, wordConfidence(parsed.khasra_number, 0.85)),
    khata_number: field(parsed.khata_number, wordConfidence(parsed.khata_number, 0.8)),
    area: field(parsed.area, wordConfidence(parsed.area, 0.6), parsed.area_unit || "hectare"),
    village: field(parsed.village, wordConfidence(parsed.village, 0.75)),
    tehsil: field(parsed.tehsil, wordConfidence(parsed.tehsil, 0.7)),
    district: field(parsed.district || doc.district, wordConfidence(parsed.district, 0.85)),
    state: field(parsed.state || doc.state || "Uttar Pradesh", 0.95),
    registration_number: field(parsed.registration_number, wordConfidence(parsed.registration_number, 0.7)),
    mutation_number: field(parsed.mutation_number, wordConfidence(parsed.mutation_number, 0.68)),
    mutation_date: field(parsed.mutation_date, wordConfidence(parsed.mutation_date, 0.65)),
  };

  const fields: ExtractionResult["fields"] = {};
  for (const [key, value] of Object.entries(candidates)) {
    if (value) fields[key] = value;
  }

  if (Object.keys(fields).length === 0) {
    throw new Error("No land record fields could be extracted from OCR text");
  }

  return { document_id: documentId, fields };
}

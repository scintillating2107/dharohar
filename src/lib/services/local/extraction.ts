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

import { GoogleGenAI, Type } from "@google/genai";

export async function runGeminiExtraction(
  documentId: string,
  ocrText: string
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!ocrText || !ocrText.trim()) {
    throw new Error("OCR text is required");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const prompt = `
You are Member 4 of an Indian land-record digitization system.

Your task is SEMANTIC FIELD EXTRACTION from OCR text.

IMPORTANT:
- The input is already OCR text.
- Do NOT perform OCR.
- Do NOT invent information.
- Do NOT guess missing values.
- Do NOT validate whether the information is legally correct.
- Do NOT compare records.
- Extract only information that is actually present in the OCR text.

Extract these land-record fields when available:

1. owner_name
2. father_name
3. khasra_number
4. khata_number
5. village
6. tehsil
7. district
8. state
9. area
10. land_type

For every extracted field return:
- value
- confidence between 0 and 1

For area:
- normalize the numeric value when possible
- return the unit separately
- use hectare when the OCR text explicitly gives hectare/hectare-equivalent information
- do not convert units unless the conversion is unambiguous

Confidence means:
How confident are you that the extracted OCR text corresponds to this semantic field?

This is NOT OCR confidence.

If a field is not present, return null.

OCR TEXT:
${ocrText}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,

    config: {
      responseMimeType: "application/json",

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          owner_name: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          father_name: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          khasra_number: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          khata_number: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          village: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          tehsil: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          district: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          state: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },

          area: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              unit: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "unit", "confidence"],
          },

          land_type: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              value: {
                type: Type.STRING,
              },
              confidence: {
                type: Type.NUMBER,
              },
            },
            required: ["value", "confidence"],
          },
        },

        required: [
          "owner_name",
          "father_name",
          "khasra_number",
          "khata_number",
          "village",
          "tehsil",
          "district",
          "state",
          "area",
          "land_type",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty extraction response");
  }

  let fields;

  try {
    fields = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  return {
    document_id: documentId,
    fields,
  };
}

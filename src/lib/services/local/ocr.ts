import type { OCRResult } from "@/types";
import { GoogleGenAI, Type } from "@google/genai";
import { ensurePageImages, readPageImageBuffer } from "@/lib/file-storage";
import { getGeminiApiKey } from "@/lib/gemini-env";

function pageFromFileUrl(url: string): number | undefined {
  try {
    const q = url.includes("?") ? url.split("?")[1] : "";
    const params = new URLSearchParams(q);
    const page = parseInt(params.get("page") || "", 10);
    return Number.isFinite(page) && page > 0 ? page : undefined;
  } catch {
    return undefined;
  }
}

/** Pipeline OCR: read page PNGs from data/uploads (not browser /api URLs). */
export async function runGeminiOCRFromDocument(
  documentId: string,
  processedImageUrls?: string[]
): Promise<OCRResult> {
  const pageNumbers: number[] = [];

  if (processedImageUrls?.length) {
    for (let i = 0; i < processedImageUrls.length; i++) {
      pageNumbers.push(pageFromFileUrl(processedImageUrls[i]) ?? i + 1);
    }
  } else {
    const total = await ensurePageImages(documentId);
    for (let p = 1; p <= total; p++) pageNumbers.push(p);
  }

  const pages: OCRResult["pages"] = [];
  for (const pageNum of pageNumbers) {
    const buffer = await readPageImageBuffer(documentId, pageNum);
    if (!buffer) {
      throw new Error(`Page ${pageNum} image missing for document ${documentId}`);
    }
    const single = await runGeminiOCR(documentId, buffer, "image/png");
    const first = single.pages[0];
    pages.push({
      ...first,
      page: pageNum,
    });
  }

  return { document_id: documentId, pages };
}

export async function runOCRLocal(documentId: string): Promise<OCRResult> {
  if (getGeminiApiKey()) {
    return runGeminiOCRFromDocument(documentId);
  }

  const { recognizeImageBuffer } = await import("@/lib/ocr-engine");
  const total = await ensurePageImages(documentId);
  const pages: OCRResult["pages"] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const buffer = await readPageImageBuffer(documentId, pageNum);
    if (!buffer) throw new Error(`Page ${pageNum} image missing for document ${documentId}`);
    const ocr = await recognizeImageBuffer(buffer);
    pages.push({
      page: pageNum,
      text: ocr.text,
      language: ocr.language,
      regions: ocr.words.map((w) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox,
      })),
    });
  }

  return { document_id: documentId, pages };
}

export async function runGeminiOCR(
  documentId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const base64Image = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",

    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },

      {
        text: `
You are an OCR engine for Indian land-record documents.

Read ALL visible text from this image.

The document can contain:
- Hindi
- English
- Hindi + English
- Printed text
- Handwritten text

Your job is ONLY OCR.

Do NOT:
- infer missing information
- correct text using assumptions
- identify semantic fields
- validate land-record information
- guess unclear characters

Return the text exactly as visible.

For every readable text region return:
- text
- confidence between 0 and 1
- bounding box

Bounding box format:
[x1, y1, x2, y2]

Also detect the document language:
"hi", "en", "mixed", or "other".

Preserve numbers exactly as written.
`
      }
    ],

    config: {
      responseMimeType: "application/json",

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          language: {
            type: Type.STRING,
          },

          text: {
            type: Type.STRING,
          },

          regions: {
            type: Type.ARRAY,

            items: {
              type: Type.OBJECT,

              properties: {
                text: {
                  type: Type.STRING,
                },

                confidence: {
                  type: Type.NUMBER,
                },

                bbox: {
                  type: Type.ARRAY,

                  items: {
                    type: Type.NUMBER,
                  },
                },
              },

              required: [
                "text",
                "confidence",
                "bbox",
              ],
            },
          },
        },

        required: [
          "language",
          "text",
          "regions",
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty OCR response");
  }

  let parsed: {
    language: string;
    text: string;
    regions: {
      text: string;
      confidence: number;
      bbox: number[];
    }[];
  };

  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  return {
    document_id: documentId,

    pages: [
      {
        page: 1,
        language: parsed.language,
        text: parsed.text,
        regions: parsed.regions,
      },
    ],
  } as OCRResult;
}
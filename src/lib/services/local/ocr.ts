import type { OCRResult } from "@/types";
import { GoogleGenAI, Type } from "@google/genai";

export async function runGeminiOCR(
  documentId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {

  const apiKey = process.env.GEMINI_API_KEY;

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
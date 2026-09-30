import type { OCRResult } from "@/types";
import { mockOCRResult } from "@/mocks/data";
import {
  callExternal,
  INTEGRATION_URLS,
  isMockMode,
  IntegrationError,
} from "./client";

import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs/promises";

export async function runOCR(
  documentId: string,
  processedImageUrls?: string[]
): Promise<OCRResult> {
  // 1. Mock mode
  if (isMockMode()) {
    await delay(1000);
    return mockOCRResult(documentId);
  }

  // 2. External Member 3 service
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

      throw new IntegrationError(
        "OCR service unavailable",
        "OCR (Member 3)"
      );
    }
  }

  // 3. Gemini OCR
  return runGeminiOCR(documentId, processedImageUrls);
}


async function runGeminiOCR(
  documentId: string,
  imageUrls?: string[]
): Promise<OCRResult> {

  if (!process.env.GEMINI_API_KEY) {
    throw new IntegrationError(
      "GEMINI_API_KEY is missing",
      "OCR (Member 3)"
    );
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new IntegrationError(
      "No processed images provided",
      "OCR (Member 3)"
    );
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const pages: any[] = [];

  for (let i = 0; i < imageUrls.length; i++) {

    const imagePath = imageUrls[i];

    const imageData = await loadImage(imagePath);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents: [
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        },

        {
          text: `
You are an OCR engine for Indian land-record documents.

Read the text from this document image carefully.

The document may contain:
- Hindi
- English
- Hindi + English mixed text
- Printed text
- Handwritten text

Your job is ONLY OCR.

DO NOT:
- identify land-record fields
- interpret meaning
- validate data
- correct values based on assumptions
- invent missing text

Return every readable text region.

For every region provide:
- exact text
- OCR confidence between 0 and 1
- bounding box

Bounding box must be:
[x1, y1, x2, y2]

Use the image pixel coordinates if possible.

Also detect the primary language:
- "hi"
- "en"
- "mixed"
- "other"

Preserve numbers exactly as written.
`,
        },
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

    const rawText = response.text;

    if (!rawText) {
      throw new IntegrationError(
        `Gemini returned empty OCR result for page ${i + 1}`,
        "OCR (Member 3)"
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new IntegrationError(
        `Invalid JSON returned by Gemini for page ${i + 1}`,
        "OCR (Member 3)"
      );
    }

    pages.push({
      page: i + 1,
      language: parsed.language,
      text: parsed.text,
      regions: parsed.regions,
    });
  }

  return {
    document_id: documentId,
    pages,
  } as OCRResult;
}


/**
 * Supports:
 * 1. Absolute/local image paths
 * 2. HTTP/HTTPS image URLs
 */
async function loadImage(
  imagePath: string
): Promise<{
  data: string;
  mimeType: string;
}> {

  // Remote image
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {

    const response = await fetch(imagePath);

    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status}`
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    const contentType =
      response.headers.get("content-type") ||
      "image/png";

    return {
      data: buffer.toString("base64"),
      mimeType: contentType,
    };
  }

  // Local image
  const buffer = await fs.readFile(imagePath);

  let mimeType = "image/png";

  if (imagePath.endsWith(".jpg") ||
      imagePath.endsWith(".jpeg")) {
    mimeType = "image/jpeg";
  }

  if (imagePath.endsWith(".webp")) {
    mimeType = "image/webp";
  }

  return {
    data: buffer.toString("base64"),
    mimeType,
  };
}


function delay(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}
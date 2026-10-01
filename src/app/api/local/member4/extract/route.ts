import { NextRequest } from "next/server";

import { apiSuccess, apiError } from "@/lib/api-utils";
import { runGeminiExtraction } from "@/lib/member-local/extraction";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { document_id, ocr_text } = body;

    if (!document_id) {
      return apiError("document_id is required");
    }

    if (!ocr_text || typeof ocr_text !== "string") {
      return apiError("ocr_text is required");
    }

    const result = await runGeminiExtraction(
      document_id,
      ocr_text
    );

    return apiSuccess(result);
  } catch (err) {
    console.error("Member 4 extraction error:", err);

    return apiError(
      err instanceof Error
        ? err.message
        : "Field extraction failed",
      500
    );
  }
}
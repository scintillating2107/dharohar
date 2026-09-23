import { NextRequest } from "next/server";
import { extractFieldsLocal } from "@/lib/services/local";
import { apiSuccess, apiError } from "@/lib/api-utils";
import type { OCRResult } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, ocr } = body;
    if (!document_id) return apiError("document_id is required");
    const result = await extractFieldsLocal(document_id, ocr as OCRResult | undefined);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Extraction failed", 500);
  }
}

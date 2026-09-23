import { NextRequest } from "next/server";
import { validateRecordLocal } from "@/lib/services/local";
import { apiSuccess, apiError } from "@/lib/api-utils";
import type { ExtractionResult } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, fields } = body;
    if (!document_id) return apiError("document_id is required");
    const extraction: ExtractionResult = { document_id, fields: fields || {} };
    const result = await validateRecordLocal(document_id, extraction);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Validation failed", 500);
  }
}

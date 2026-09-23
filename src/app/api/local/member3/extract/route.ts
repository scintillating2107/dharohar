import { NextRequest } from "next/server";
import { runOCRLocal } from "@/lib/services/local";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id } = body;
    if (!document_id) return apiError("document_id is required");
    const result = await runOCRLocal(document_id);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "OCR failed", 500);
  }
}

import { NextRequest } from "next/server";
import { processImagesLocal } from "@/lib/services/local";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document_id, page_count } = body;
    if (!document_id) return apiError("document_id is required");
    const result = await processImagesLocal(document_id, page_count || 1);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Image processing failed", 500);
  }
}

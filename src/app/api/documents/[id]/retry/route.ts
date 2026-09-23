import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { retryProcessingFromStep } from "@/lib/processing-pipeline";
import { apiSuccess, unauthorized, notFound, apiError } from "@/lib/api-utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const doc = store.getDocument(id);
  if (!doc) return notFound("Document not found");

  if (doc.status !== "FAILED") {
    return apiError("Only failed documents can be retried");
  }

  retryProcessingFromStep(id).catch(console.error);

  return apiSuccess({ documentId: id, message: "Processing retry started" });
}

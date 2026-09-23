import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { runProcessingPipeline } from "@/lib/processing-pipeline";
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

  if (doc.status !== "UPLOADED" && doc.status !== "FAILED") {
    return apiError("Document is already being processed or completed");
  }

  runProcessingPipeline(id).catch(console.error);

  return apiSuccess(
    { documentId: id, message: "Processing started" },
    "Processing started"
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const doc = store.getDocument(id);
  if (!doc) return notFound("Document not found");

  return apiSuccess({
    documentId: id,
    status: doc.status,
    steps: doc.steps,
  });
}

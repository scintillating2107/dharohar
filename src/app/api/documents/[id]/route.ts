import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized, notFound } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const doc = store.getDocument(id);
  if (!doc) return notFound("Document not found");

  const record = doc.recordId ? store.getRecord(doc.recordId) : undefined;

  return apiSuccess({ document: doc, record });
}

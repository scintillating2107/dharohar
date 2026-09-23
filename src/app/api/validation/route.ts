import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized, notFound } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  const recordId = searchParams.get("recordId");

  let record;
  if (recordId) {
    record = store.getRecord(recordId);
  } else if (documentId) {
    record = store.records.find((r) => r.document_id === documentId);
  }

  if (!record?.validation) return notFound("Validation result not found");

  return apiSuccess({ validation: record.validation, record });
}

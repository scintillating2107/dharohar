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
  const record = store.getRecord(id);
  if (!record) return notFound("Record not found");

  const document = store.getDocument(record.document_id);
  const auditEvents = store.auditEvents.filter((e) => e.recordId === id);
  const parcel = store.getParcelByRecord(id);

  return apiSuccess({ record, document, auditEvents, parcel });
}

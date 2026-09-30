import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { isCitizenRole, citizenCanViewRecord } from "@/lib/citizen";
import { apiSuccess, unauthorized, notFound, forbidden } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const record = store.getRecord(id);
  if (!record) return notFound("Record not found");

  const user = store.users.find((u) => u.id === session.userId);
  const role = user?.role ?? session.role;
  if (isCitizenRole(role) && user && !citizenCanViewRecord(record, user)) {
    return forbidden("This record is not available for public view");
  }

  const document = store.getDocument(record.document_id);
  const auditEvents = store.auditEvents.filter((e) => e.recordId === id);
  const parcel = store.getParcelByRecord(id);

  return apiSuccess({ record, document, auditEvents, parcel });
}

import { requireUser } from "@/server/auth";
import { getRecordByDocument, getRecordRow, toRecord } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

/** Validation result for one record (by recordId or documentId). Lists use /api/records?validationStatus=… */
export const GET = handle(async (request: Request) => {
  await requireUser("validation");
  const url = new URL(request.url);
  const recordId = url.searchParams.get("recordId");
  const documentId = url.searchParams.get("documentId");
  const row = recordId ? await getRecordRow(recordId) : documentId ? await getRecordByDocument(documentId) : undefined;
  if (!row?.validation) return fail("Validation result not found", 404);
  return ok({ validation: row.validation, record: toRecord(row) });
});

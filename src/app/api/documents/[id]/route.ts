import { requireUser } from "@/server/auth";
import { getDocument, getOcr, getRecordByDocument, toRecord } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser("documents");
  const { id } = await ctx.params;
  const document = await getDocument(id);
  if (!document) return fail("Document not found", 404);
  const recordRow = await getRecordByDocument(id);
  const ocr = await getOcr(id);
  return ok({ document, record: recordRow ? toRecord(recordRow, ocr) : null, ocr: ocr ?? null });
});

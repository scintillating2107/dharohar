import { requireUser } from "@/server/auth";
import { claimedRecordIds } from "@/server/citizen";
import { listAudit } from "@/server/audit";
import { correctionsForRecord } from "@/server/learning";
import {
  getDocument,
  getOcr,
  getParcelForRecord,
  getRecordRow,
  getRecordVersions,
  toRecord,
} from "@/server/repo";
import { fail, handle, ok } from "@/server/http";
import { hasPermission } from "@/lib/config";

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("records");
  const { id } = await ctx.params;
  const row = await getRecordRow(id);
  if (!row) return fail("Record not found", 404);
  const parcel = await getParcelForRecord(id);

  if (user.role === "CITIZEN") {
    const claimed = (await claimedRecordIds(user.id)).includes(id);
    if (row.status !== "VERIFIED" && !claimed) return fail("This record is not available for public view", 403);
    // Citizens see the certified record, not internal processing artefacts
    return ok({ record: toRecord(row), parcel, document: null, auditEvents: [], versions: [], corrections: [], claimed });
  }

  // Scans and OCR text are only for roles that may view documents
  const canSeeDocuments = hasPermission(user.role, "documents");
  const [ocr, document, audit, versions, corrections] = await Promise.all([
    canSeeDocuments ? getOcr(row.documentId) : Promise.resolve(undefined),
    canSeeDocuments ? getDocument(row.documentId) : Promise.resolve(null),
    listAudit({ recordId: id, documentId: row.documentId, limit: 200 }),
    getRecordVersions(id),
    correctionsForRecord(id),
  ]);
  return ok({
    record: toRecord(row, ocr),
    document,
    auditEvents: audit.items,
    parcel,
    versions,
    corrections: corrections.map((c) => ({ field: c.field, aiValue: c.aiValue, humanValue: c.humanValue, accepted: c.accepted })),
  });
});

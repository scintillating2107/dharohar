import { eq, or } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { verificationTasks } from "@/server/db/schema";
import { listAudit } from "@/server/audit";
import { getSettings } from "@/server/settings";
import { approveRecord, rejectRecord, saveDraft, sendBackRecord } from "@/server/records-service";
import { getDocument, getOcr, getRecordRow, getRecordVersions, getParcelForRecord, toRecord, toTask } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";
import { scheduleJobRun } from "@/server/kick";
import type { Owner } from "@/types";

export const maxDuration = 300;

async function findTask(id: string) {
  const db = await getDb();
  const [task] = await db
    .select()
    .from(verificationTasks)
    .where(or(eq(verificationTasks.id, id), eq(verificationTasks.recordId, id)));
  return task;
}

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser("verification");
  const { id } = await ctx.params;
  const task = await findTask(id);
  if (!task) return fail("Verification task not found", 404);
  const recordRow = await getRecordRow(task.recordId);
  if (!recordRow) return fail("Record not found", 404);
  const [document, ocr, audit, versions, parcel, settings] = await Promise.all([
    getDocument(task.documentId),
    getOcr(task.documentId),
    listAudit({ recordId: task.recordId, documentId: task.documentId, limit: 200 }),
    getRecordVersions(task.recordId),
    getParcelForRecord(task.recordId),
    getSettings(),
  ]);
  const aiVersion = [...versions].reverse().find((v) => v.created_by === "System");
  return ok({
    task: toTask(task, recordRow),
    record: toRecord(recordRow, ocr),
    document,
    auditEvents: audit.items,
    versions,
    aiFields: aiVersion?.snapshot.fields ?? null,
    parcel,
    settings: { reviewThreshold: settings.reviewThreshold, makerChecker: settings.makerChecker },
  });
});

export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("verification");
  const { id } = await ctx.params;
  const task = await findTask(id);
  if (!task) return fail("Verification task not found", 404);
  const body = await request.json();
  const fields = body.fields && typeof body.fields === "object" ? (body.fields as Record<string, string>) : undefined;
  const owners = Array.isArray(body.owners) ? (body.owners as Owner[]) : undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : undefined;
  const actor = { id: user.id, name: user.name };

  switch (body.action) {
    case "save_draft":
      return ok({ record: await saveDraft(task.recordId, { fields, owners, comment }, actor) });
    case "approve":
      return ok({ record: await approveRecord(task.recordId, { fields, owners, comment }, actor) });
    case "reject":
      return ok({ record: await rejectRecord(task.recordId, comment ?? "", actor) });
    case "send_back":
      await sendBackRecord(task.recordId, comment ?? "", actor);
      scheduleJobRun();
      return ok({ queued: true });
    default:
      return fail("Invalid action");
  }
});

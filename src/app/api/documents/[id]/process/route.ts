import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";
import { enqueueJob, hasActiveJob } from "@/server/jobs";
import { scheduleJobRun } from "@/server/kick";
import { getDocumentRow } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

export const maxDuration = 300;

/** Queues the pipeline. A FAILED document resumes from the step that failed. */
export const POST = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("documents");
  const { id } = await ctx.params;
  const doc = await getDocumentRow(id);
  if (!doc) return fail("Document not found", 404);
  if (!["UPLOADED", "FAILED", "QUEUED"].includes(doc.status)) {
    return fail("Document is already being processed or has completed processing", 409);
  }
  if (!(await hasActiveJob("process_document", id))) {
    const db = await getDb();
    await db.update(documents).set({ status: "QUEUED", error: null }).where(eq(documents.id, id));
    await enqueueJob("process_document", { documentId: id });
    await appendAudit({
      action: "PROCESSING_QUEUED",
      actor: user.id,
      actorName: user.name,
      documentId: id,
      details: doc.status === "FAILED" ? "Retry from the failed step" : undefined,
    });
  }
  scheduleJobRun();
  return ok({ documentId: id, status: "QUEUED" }, { message: "Processing queued" });
});

export const GET = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser("documents");
  const { id } = await ctx.params;
  const doc = await getDocumentRow(id);
  if (!doc) return fail("Document not found", 404);
  return ok({ documentId: id, status: doc.status, steps: doc.steps, error: doc.error });
});

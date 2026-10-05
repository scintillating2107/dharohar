import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb } from "@/server/db/client";
import { citizenClaims } from "@/server/db/schema";
import { notifyUsers } from "@/server/notifications";
import { fail, handle, ok } from "@/server/http";

/** Officer decision on a citizen's ownership claim. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const officer = await requireUser("claims");
  const { id } = await ctx.params;
  const { decision, comment } = await request.json();
  if (decision !== "APPROVED" && decision !== "REJECTED") return fail("decision must be APPROVED or REJECTED");
  if (decision === "REJECTED" && !String(comment ?? "").trim()) return fail("A reason is required to reject a claim");
  const db = await getDb();
  const [claim] = await db.select().from(citizenClaims).where(eq(citizenClaims.id, id));
  if (!claim) return fail("Claim not found", 404);
  if (claim.status !== "PENDING") return fail("Claim has already been reviewed", 409);
  await db
    .update(citizenClaims)
    .set({
      status: decision,
      reviewedBy: officer.name,
      reviewComment: String(comment ?? "").trim().slice(0, 1000) || null,
      reviewedAt: new Date().toISOString(),
    })
    .where(eq(citizenClaims.id, id));
  await appendAudit({
    action: "CLAIM_REVIEWED",
    actor: officer.id,
    actorName: officer.name,
    recordId: claim.recordId,
    details: `${decision} claim ${id} (${claim.relationship})${comment ? `: ${comment}` : ""}`,
  });
  await notifyUsers([claim.userId], {
    title: `Your claim on ${claim.recordId} was ${decision.toLowerCase()}`,
    body: comment || undefined,
    link: "/citizen/dashboard",
  });
  return ok({ id, status: decision });
});

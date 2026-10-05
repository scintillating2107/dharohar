import { and, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { newId } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { citizenClaims, records, users } from "@/server/db/schema";
import { notifyRoles } from "@/server/notifications";
import { iso } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";
import { hasPermission } from "@/lib/config";
import type { CitizenClaim } from "@/types";

/** Citizens see their own claims; officers with the claims permission see the review queue. */
export const GET = handle(async (request: Request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const db = await getDb();
  const reviewer = hasPermission(user.role, "claims");
  const status = url.searchParams.get("status");
  const conds = [];
  if (!reviewer) conds.push(eq(citizenClaims.userId, user.id));
  if (status) conds.push(eq(citizenClaims.status, status));
  const rows = await db
    .select({ claim: citizenClaims, userName: users.name, ownerName: records.ownerName, village: records.village })
    .from(citizenClaims)
    .leftJoin(users, eq(users.id, citizenClaims.userId))
    .leftJoin(records, eq(records.id, citizenClaims.recordId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(citizenClaims.createdAt))
    .limit(200);
  const items: (CitizenClaim & { ownerName: string | null; village: string | null })[] = rows.map((r) => ({
    id: r.claim.id,
    userId: r.claim.userId,
    userName: r.userName ?? undefined,
    recordId: r.claim.recordId,
    relationship: r.claim.relationship,
    note: r.claim.note ?? undefined,
    status: r.claim.status as CitizenClaim["status"],
    reviewedBy: r.claim.reviewedBy ?? undefined,
    reviewComment: r.claim.reviewComment ?? undefined,
    createdAt: iso(r.claim.createdAt)!,
    reviewedAt: iso(r.claim.reviewedAt),
    ownerName: r.ownerName,
    village: r.village,
  }));
  return ok({ items });
});

/** A citizen claims a link to a land record (as owner, heir, co-owner, …) for officer review. */
export const POST = handle(async (request: Request) => {
  const user = await requireUser("citizen");
  const { recordId, relationship, note } = await request.json();
  if (!recordId || !relationship) return fail("Record ID and relationship are required");
  const allowed = ["Owner", "Co-owner", "Legal heir", "Power of attorney holder", "Lessee"];
  if (!allowed.includes(relationship)) return fail("Unknown relationship");
  const db = await getDb();
  const [record] = await db.select({ id: records.id, district: records.district }).from(records).where(eq(records.id, String(recordId).trim()));
  if (!record) return fail("No land record with that ID", 404);
  const [existing] = await db
    .select({ id: citizenClaims.id })
    .from(citizenClaims)
    .where(and(eq(citizenClaims.userId, user.id), eq(citizenClaims.recordId, record.id), inArray(citizenClaims.status, ["PENDING", "APPROVED"])));
  if (existing) return fail("You already have a pending or approved claim on this record", 409);

  const id = newId("CL");
  await db.insert(citizenClaims).values({
    id,
    userId: user.id,
    recordId: record.id,
    relationship,
    note: typeof note === "string" ? note.trim().slice(0, 1000) || null : null,
  });
  await appendAudit({
    action: "CLAIM_SUBMITTED",
    actor: user.id,
    actorName: user.name,
    recordId: record.id,
    details: `${relationship}${note ? `: ${String(note).slice(0, 200)}` : ""}`,
  });
  await notifyRoles(
    ["VERIFICATION_OFFICER"],
    { title: `Ownership claim on ${record.id}`, body: `${user.name} (${relationship})`, link: "/claims" },
    record.district || undefined
  );
  return ok({ id });
});

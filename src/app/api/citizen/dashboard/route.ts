import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { citizenClaims, records } from "@/server/db/schema";
import { iso } from "@/server/repo";
import { handle, ok } from "@/server/http";

export const GET = handle(async () => {
  const user = await requireUser("citizen");
  const db = await getDb();
  const claims = await db
    .select({ claim: citizenClaims, record: records })
    .from(citizenClaims)
    .leftJoin(records, eq(records.id, citizenClaims.recordId))
    .where(eq(citizenClaims.userId, user.id))
    .orderBy(desc(citizenClaims.createdAt));
  const approvedIds = claims.filter((c) => c.claim.status === "APPROVED").map((c) => c.claim.recordId);
  const myRecords = approvedIds.length ? await db.select().from(records).where(inArray(records.id, approvedIds)) : [];

  const district = user.district ?? null;
  const districtFilter = district ? and(eq(records.status, "VERIFIED"), ilike(records.district, district)) : eq(records.status, "VERIFIED");
  const publicVerified = await db.select().from(records).where(districtFilter).orderBy(desc(records.verifiedAt)).limit(8);
  const [{ n: districtVerified }] = await db.select({ n: sql<number>`count(*)::int` }).from(records).where(districtFilter);

  return ok({
    user: { name: user.name, district: district ?? "All districts", email: user.email },
    stats: {
      my_records: myRecords.length,
      my_verified: myRecords.filter((r) => r.status === "VERIFIED").length,
      pending_claims: claims.filter((c) => c.claim.status === "PENDING").length,
      district_verified_total: districtVerified,
    },
    myRecords: myRecords.map((r) => ({
      recordId: r.id,
      ownerName: r.ownerName,
      khasraNumber: r.khasraNumber,
      village: r.village,
      district: r.district,
      status: r.status,
      updatedAt: iso(r.updatedAt)!,
    })),
    claims: claims.map(({ claim, record }) => ({
      id: claim.id,
      recordId: claim.recordId,
      relationship: claim.relationship,
      status: claim.status,
      reviewComment: claim.reviewComment,
      createdAt: iso(claim.createdAt)!,
      ownerName: record?.ownerName ?? null,
      village: record?.village ?? null,
    })),
    publicVerified: publicVerified.map((r) => ({
      recordId: r.id,
      ownerName: r.ownerName,
      khasraNumber: r.khasraNumber,
      village: r.village,
      tehsil: r.tehsil,
      district: r.district,
      area: r.area,
      areaUnit: r.areaUnit,
      verifiedAt: iso(r.verifiedAt ?? r.updatedAt)!,
    })),
  });
});

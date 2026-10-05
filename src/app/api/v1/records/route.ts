import { and, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { requireApiAccess } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { records } from "@/server/db/schema";
import { normalizeKhasra } from "@/server/pipeline/normalize";
import { v1Error, v1Record } from "@/server/api-v1";

/** GET /api/v1/records — verified land records (filters: district, tehsil, village, khasra, updated_since). */
export async function GET(request: Request) {
  try {
    await requireApiAccess(request, "records:read");
    const url = new URL(request.url);
    // Only verified records by default; status=ALL also returns records still under review
    const conds: SQL[] = url.searchParams.get("status") === "ALL" ? [] : [eq(records.status, "VERIFIED")];
    for (const key of ["district", "tehsil", "village", "state"] as const) {
      const v = url.searchParams.get(key);
      if (v) conds.push(ilike(records[key], v));
    }
    const khasra = url.searchParams.get("khasra");
    if (khasra) conds.push(eq(records.khasraNormalized, normalizeKhasra(khasra)));
    const since = url.searchParams.get("updated_since");
    if (since && !Number.isNaN(Date.parse(since))) conds.push(sql`${records.updatedAt} >= ${new Date(since).toISOString()}`);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const where = conds.length ? and(...conds) : undefined;
    const db = await getDb();
    const rows = await db.select().from(records).where(where).orderBy(desc(records.updatedAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(records).where(where);
    return Response.json({ data: rows.map(v1Record), total, limit, offset });
  } catch (err) {
    return v1Error(err);
  }
}

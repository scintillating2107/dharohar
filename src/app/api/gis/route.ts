import { and, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { claimedRecordIds } from "@/server/citizen";
import { getDb } from "@/server/db/client";
import { parcels, records } from "@/server/db/schema";
import { toParcel } from "@/server/repo";
import { handle, ok } from "@/server/http";

export const GET = handle(async (request: Request) => {
  const user = await requireUser("gis");
  const url = new URL(request.url);
  const conds: SQL[] = [];
  const district = url.searchParams.get("district");
  if (district) conds.push(ilike(records.district, district));
  const village = url.searchParams.get("village");
  if (village) conds.push(ilike(records.village, village));
  const status = url.searchParams.get("status");
  if (status) conds.push(eq(records.status, status));
  const geometry = url.searchParams.get("geometry");
  if (geometry) conds.push(eq(parcels.geometrySource, geometry));
  const search = url.searchParams.get("search")?.trim();
  if (search) {
    const q = `%${search}%`;
    conds.push(or(ilike(records.khasraNumber, q), ilike(records.ownerName, q), ilike(records.village, q), ilike(records.id, q))!);
  }
  if (user.role === "CITIZEN") {
    const claimed = await claimedRecordIds(user.id);
    conds.push(claimed.length ? or(eq(records.status, "VERIFIED"), inArray(records.id, claimed))! : eq(records.status, "VERIFIED"));
  }
  const db = await getDb();
  const rows = await db
    .select({ parcel: parcels, record: records })
    .from(parcels)
    .innerJoin(records, eq(records.id, parcels.recordId))
    .where(conds.length ? and(...conds) : undefined)
    .limit(2000);
  return ok({ parcels: rows.map((r) => toParcel(r.parcel, r.record)) });
});

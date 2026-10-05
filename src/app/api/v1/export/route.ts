import { and, asc, eq, ilike, type SQL } from "drizzle-orm";
import { requireApiAccess } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { records } from "@/server/db/schema";
import { v1Error, v1Record } from "@/server/api-v1";

const CSV_COLUMNS = [
  "record_id",
  "version",
  "state",
  "district",
  "tehsil",
  "village",
  "khata_number",
  "khasra_number",
  "survey_number",
  "owner_name",
  "father_name",
  "co_owners",
  "land_type",
  "area",
  "area_unit",
  "area_hectares",
  "mutation_number",
  "mutation_date",
  "registration_number",
  "verified_at",
  "record_hash",
] as const;

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Bulk export of verified records for LRMS / DILRMP ingestion (CSV or JSON). */
export async function GET(request: Request) {
  try {
    await requireApiAccess(request, "export:read");
    const url = new URL(request.url);
    const conds: SQL[] = [eq(records.status, "VERIFIED")];
    const district = url.searchParams.get("district");
    if (district) conds.push(ilike(records.district, district));
    const db = await getDb();
    const rows = (await db.select().from(records).where(and(...conds)).orderBy(asc(records.district), asc(records.village))).map(v1Record);

    if (url.searchParams.get("format") === "json") {
      return Response.json({ data: rows, exported_at: new Date().toISOString() });
    }
    const lines = [CSV_COLUMNS.join(",")];
    for (const r of rows) {
      const flat: Record<(typeof CSV_COLUMNS)[number], unknown> = {
        ...r,
        co_owners: r.owners.slice(1).map((o) => o.name).join("; "),
        record_hash: r.certificate?.record_hash ?? "",
      } as never;
      lines.push(CSV_COLUMNS.map((c) => csvCell(flat[c])).join(","));
    }
    return new Response("﻿" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dharohar-verified-records-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return v1Error(err);
  }
}

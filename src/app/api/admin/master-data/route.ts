import { asc, ilike, sql } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb, queryRows } from "@/server/db/client";
import { masterLocations } from "@/server/db/schema";
import { invalidateMasterCache } from "@/server/master";
import { fail, handle, ok } from "@/server/http";

export const GET = handle(async (request: Request) => {
  await requireUser("settings_admin");
  const db = await getDb();
  const url = new URL(request.url);
  const counts = await queryRows<{ level: string; n: number }>(
    db,
    sql`select level, count(*)::int as n from master_locations group by level order by level`
  );
  const district = url.searchParams.get("district");
  const rows = await db
    .select()
    .from(masterLocations)
    .where(district ? ilike(masterLocations.district, district) : undefined)
    .orderBy(asc(masterLocations.level), asc(masterLocations.district))
    .limit(200);
  return ok({ counts, rows });
});

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((c) => c.trim())) out.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) out.push(row);
  return out;
}

/**
 * Imports LGD-style master data. CSV header must include: level,state,district and may include
 * tehsil,village,name_hi,lgd_code,lat,lng. level ∈ state|district|tehsil|village.
 */
export const POST = handle(async (request: Request) => {
  const admin = await requireUser("settings_admin");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Upload a CSV file");
  if (file.size > 20 * 1024 * 1024) return fail("CSV exceeds 20 MB");
  const table = parseCsv((await file.text()).replace(/^﻿/, ""));
  if (table.length < 2) return fail("CSV has no data rows");
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  for (const required of ["level", "state", "district"]) {
    if (col(required) < 0) return fail(`Missing column: ${required}`);
  }
  const levels = new Set(["state", "district", "tehsil", "village"]);
  const values: (typeof masterLocations.$inferInsert)[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, i) => {
    const get = (name: string) => (col(name) >= 0 ? cells[col(name)]?.trim() || null : null);
    const level = get("level")?.toLowerCase() ?? "";
    const lat = get("lat") ? Number(get("lat")) : null;
    const lng = get("lng") ? Number(get("lng")) : null;
    if (!levels.has(level)) return void errors.push(`Row ${i + 2}: invalid level "${level}"`);
    if (!get("state")) return void errors.push(`Row ${i + 2}: state is required`);
    if (level !== "state" && !get("district")) return void errors.push(`Row ${i + 2}: district is required`);
    if (level === "tehsil" && !get("tehsil")) return void errors.push(`Row ${i + 2}: tehsil is required`);
    if (level === "village" && !get("village")) return void errors.push(`Row ${i + 2}: village is required`);
    if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng)))
      return void errors.push(`Row ${i + 2}: invalid coordinates`);
    values.push({
      level,
      state: get("state")!,
      district: get("district") ?? "",
      tehsil: get("tehsil"),
      village: get("village"),
      nameHi: get("name_hi"),
      lgdCode: get("lgd_code"),
      lat,
      lng,
    });
  });
  if (errors.length) return fail(`CSV has ${errors.length} invalid row(s): ${errors.slice(0, 5).join("; ")}`);

  const db = await getDb();
  for (let i = 0; i < values.length; i += 500) await db.insert(masterLocations).values(values.slice(i, i + 500));
  invalidateMasterCache();
  await appendAudit({
    action: "MASTER_DATA_IMPORTED",
    actor: admin.id,
    actorName: admin.name,
    details: `${values.length} rows from ${file.name}`,
  });
  return ok({ imported: values.length });
});

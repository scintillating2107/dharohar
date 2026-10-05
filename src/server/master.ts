import { getDb } from "@/server/db/client";
import { masterLocations } from "@/server/db/schema";
import { nameSimilarity, placeKey } from "@/server/pipeline/normalize";

export type MasterRow = typeof masterLocations.$inferSelect;

let cache: { rows: MasterRow[]; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function loadMaster(): Promise<MasterRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const db = await getDb();
  const rows = await db.select().from(masterLocations);
  cache = { rows, at: Date.now() };
  return rows;
}

export function invalidateMasterCache(): void {
  cache = null;
}

export interface MasterMatch {
  row: MasterRow;
  name: string;
  similarity: number;
}

function rowName(row: MasterRow): string {
  switch (row.level) {
    case "state":
      return row.state;
    case "district":
      return row.district;
    case "tehsil":
      return row.tehsil ?? "";
    default:
      return row.village ?? "";
  }
}

/** Best fuzzy match (English or Hindi name) among master rows of a level, optionally scoped. */
export function matchPlace(
  rows: MasterRow[],
  level: MasterRow["level"],
  value: string | null | undefined,
  scope: { state?: string | null; district?: string | null; tehsil?: string | null } = {}
): MasterMatch | null {
  if (!value?.trim()) return null;
  const key = placeKey(value);
  if (!key) return null;
  let best: MasterMatch | null = null;
  for (const row of rows) {
    if (row.level !== level) continue;
    if (scope.state && level !== "state" && row.state.toLowerCase() !== scope.state.toLowerCase()) continue;
    if (scope.district && (level === "tehsil" || level === "village") && row.district.toLowerCase() !== scope.district.toLowerCase())
      continue;
    const name = rowName(row);
    const sim = Math.max(
      placeKey(name) === key ? 1 : nameSimilarity(name, value),
      row.nameHi ? (placeKey(row.nameHi) === key ? 1 : nameSimilarity(row.nameHi, value)) : 0
    );
    if (!best || sim > best.similarity) best = { row, name, similarity: sim };
  }
  return best;
}

export function hasCoverage(
  rows: MasterRow[],
  level: MasterRow["level"],
  scope: { state?: string | null; district?: string | null }
): boolean {
  return rows.some(
    (r) =>
      r.level === level &&
      (!scope.state || r.state.toLowerCase() === scope.state.toLowerCase()) &&
      (!scope.district || r.district.toLowerCase() === scope.district.toLowerCase())
  );
}

export interface CanonicalLocation {
  state: string;
  district: string;
  tehsil: string;
  village: string;
  lat: number | null;
  lng: number | null;
  precision: "village" | "tehsil" | "district" | "none";
  matched: { state?: MasterMatch; district?: MasterMatch; tehsil?: MasterMatch; village?: MasterMatch };
}

const MATCH_THRESHOLD = 0.85;

/** Maps extracted place names (any script) to canonical master names and best-known coordinates. */
export function canonicalizeLocation(
  rows: MasterRow[],
  raw: { state?: string; district?: string; tehsil?: string; village?: string }
): CanonicalLocation {
  const state = matchPlace(rows, "state", raw.state);
  const stateName = state && state.similarity >= MATCH_THRESHOLD ? state.name : raw.state ?? "";
  const district = matchPlace(rows, "district", raw.district, { state: stateName || undefined });
  const districtName = district && district.similarity >= MATCH_THRESHOLD ? district.name : raw.district ?? "";
  const tehsil = matchPlace(rows, "tehsil", raw.tehsil, { state: stateName, district: districtName });
  const tehsilName = tehsil && tehsil.similarity >= MATCH_THRESHOLD ? tehsil.name : raw.tehsil ?? "";
  const village = matchPlace(rows, "village", raw.village, { state: stateName, district: districtName });
  const villageName = village && village.similarity >= MATCH_THRESHOLD ? village.name : raw.village ?? "";

  const ok = (m: MasterMatch | null) => (m && m.similarity >= MATCH_THRESHOLD ? m : undefined);
  const coordSource = [
    ["village", ok(village)],
    ["tehsil", ok(tehsil)],
    ["district", ok(district)],
  ] as const;
  let lat: number | null = null;
  let lng: number | null = null;
  let precision: CanonicalLocation["precision"] = "none";
  for (const [level, m] of coordSource) {
    if (m?.row.lat != null && m.row.lng != null) {
      lat = m.row.lat;
      lng = m.row.lng;
      precision = level;
      break;
    }
  }

  return {
    state: stateName,
    district: districtName,
    tehsil: tehsilName,
    village: villageName,
    lat,
    lng,
    precision,
    matched: { state: ok(state), district: ok(district), tehsil: ok(tehsil), village: ok(village) },
  };
}

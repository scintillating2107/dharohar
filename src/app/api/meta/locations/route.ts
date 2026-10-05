import { sql } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb, queryRows } from "@/server/db/client";
import { loadMaster } from "@/server/master";
import { handle, ok } from "@/server/http";

/** Filter options: master-data places plus any district actually present in records. */
export const GET = handle(async (request: Request) => {
  await requireUser();
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "Uttar Pradesh";
  const district = url.searchParams.get("district");
  const master = await loadMaster();
  const db = await getDb();
  const recordDistricts = await queryRows<{ district: string }>(
    db,
    sql`select distinct district from records where district <> '' order by district`
  );

  const uniq = (list: (string | null | undefined)[]) =>
    [...new Set(list.filter((x): x is string => Boolean(x && x.trim())))].sort((a, b) => a.localeCompare(b));

  return ok({
    states: uniq(master.filter((m) => m.level === "state").map((m) => m.state)),
    districts: uniq([
      ...master.filter((m) => m.level === "district" && m.state.toLowerCase() === state.toLowerCase()).map((m) => m.district),
      ...recordDistricts.map((r) => r.district),
    ]),
    tehsils: district
      ? uniq(master.filter((m) => m.level === "tehsil" && m.district.toLowerCase() === district.toLowerCase()).map((m) => m.tehsil))
      : [],
    villages: district
      ? uniq(master.filter((m) => m.level === "village" && m.district.toLowerCase() === district.toLowerCase()).map((m) => m.village))
      : [],
  });
});

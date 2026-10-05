import { and, asc, desc, eq, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { records, verificationTasks } from "@/server/db/schema";
import { getSettings } from "@/server/settings";
import { toTask } from "@/server/repo";
import { handle, paginated, pagination } from "@/server/http";

const PRIORITY_ORDER = sql`case ${verificationTasks.priority} when 'URGENT' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end`;

export const GET = handle(async (request: Request) => {
  await requireUser("verification");
  const url = new URL(request.url);
  const { page, pageSize, limit, offset } = pagination(url);
  const settings = await getSettings();
  const conds: SQL[] = [];

  const status = url.searchParams.get("status");
  if (status === "OPEN" || !status) conds.push(inArray(verificationTasks.status, ["PENDING", "IN_REVIEW"]));
  else if (status !== "ALL") conds.push(eq(verificationTasks.status, status));
  const district = url.searchParams.get("district");
  if (district) conds.push(ilike(records.district, district));
  if (url.searchParams.get("lowConfidence") === "true") conds.push(lt(verificationTasks.confidence, settings.reviewThreshold));
  if (url.searchParams.get("validationIssue") === "true") conds.push(ne(verificationTasks.validationStatus, "VALID"));
  const priority = url.searchParams.get("priority");
  if (priority) conds.push(eq(verificationTasks.priority, priority));
  const search = url.searchParams.get("search")?.trim();
  if (search) {
    const q = `%${search}%`;
    conds.push(or(ilike(records.id, q), ilike(records.ownerName, q), ilike(records.khasraNumber, q), ilike(records.village, q))!);
  }
  const where = conds.length ? and(...conds) : undefined;

  const db = await getDb();
  const rows = await db
    .select({ task: verificationTasks, record: records })
    .from(verificationTasks)
    .innerJoin(records, eq(records.id, verificationTasks.recordId))
    .where(where)
    .orderBy(asc(PRIORITY_ORDER), desc(verificationTasks.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(verificationTasks)
    .innerJoin(records, eq(records.id, verificationTasks.recordId))
    .where(where);

  return paginated(
    rows.map((r) => toTask(r.task, r.record)),
    count,
    page,
    pageSize
  );
});

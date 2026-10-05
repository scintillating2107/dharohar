import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, queryRows } from "@/server/db/client";
import { documents, records, verificationTasks } from "@/server/db/schema";
import { accuracyMetrics } from "@/server/learning";
import { iso } from "@/server/repo";
import { LANGUAGE_NAMES } from "@/server/pipeline/normalize";
import type { DashboardStats } from "@/types";
import { ISSUE_LABELS } from "@/lib/config";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  return queryRows<T>(await getDb(), query);
}

export async function dashboardData() {
  const db = await getDb();

  const [docCounts] = await rows<{ total: number; processed: number; failed: number }>(sql`
    select count(*)::int as total,
      sum(case when status in ('VERIFICATION_REQUIRED','VERIFIED','REJECTED') then 1 else 0 end)::int as processed,
      sum(case when status = 'FAILED' then 1 else 0 end)::int as failed
    from documents`);
  const [recCounts] = await rows<{ verified: number; issues: number; avg: number | null }>(sql`
    select sum(case when status = 'VERIFIED' then 1 else 0 end)::int as verified,
      sum(case when status = 'VERIFICATION_REQUIRED' and validation->>'validation_status' <> 'VALID' then 1 else 0 end)::int as issues,
      avg(average_confidence) as avg
    from records`);
  const [taskCounts] = await rows<{ pending: number }>(sql`
    select count(*)::int as pending from verification_tasks where status in ('PENDING','IN_REVIEW')`);
  const accuracy = await accuracyMetrics();

  const stats: DashboardStats = {
    total_documents: docCounts?.total ?? 0,
    processed_documents: docCounts?.processed ?? 0,
    failed_documents: docCounts?.failed ?? 0,
    verified_records: recCounts?.verified ?? 0,
    pending_verification: taskCounts?.pending ?? 0,
    validation_issues: recCounts?.issues ?? 0,
    average_confidence: recCounts?.avg ? Math.round(Number(recCounts.avg) * 1000) / 10 : 0,
    extraction_accuracy: accuracy.overall,
  };

  const progress = await rows<{ state: string; district: string; total: number; verified: number }>(sql`
    select coalesce(nullif(state,''),'Unknown') as state, coalesce(nullif(district,''),'Unknown') as district,
      count(*)::int as total, sum(case when status='VERIFIED' then 1 else 0 end)::int as verified
    from records group by 1, 2 order by total desc`);
  const districtProgress = progress.map((p) => ({
    district: p.district,
    state: p.state,
    total: p.total,
    processed: p.total,
    verified: p.verified,
    percentage: p.total ? Math.round((p.verified / p.total) * 100) : 0,
  }));
  const stateMap = new Map<string, { total: number; verified: number }>();
  for (const p of progress) {
    const s = stateMap.get(p.state) ?? { total: 0, verified: 0 };
    s.total += p.total;
    s.verified += p.verified;
    stateMap.set(p.state, s);
  }
  const stateProgress = [...stateMap.entries()].map(([state, v]) => ({
    state,
    total: v.total,
    processed: v.total,
    verified: v.verified,
    percentage: v.total ? Math.round((v.verified / v.total) * 100) : 0,
  }));

  // Six-month throughput: uploads, extracted records and verified records per month
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const uploads = await rows<{ m: string; n: number }>(sql`
    select to_char(uploaded_at, 'YYYY-MM') as m, count(*)::int as n from documents where uploaded_at >= ${sinceIso} group by 1`);
  const extracted = await rows<{ m: string; n: number }>(sql`
    select to_char(created_at, 'YYYY-MM') as m, count(*)::int as n from records where created_at >= ${sinceIso} group by 1`);
  const verified = await rows<{ m: string; n: number }>(sql`
    select to_char(verified_at, 'YYYY-MM') as m, count(*)::int as n from records where verified_at >= ${sinceIso} group by 1`);
  const processingChart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const find = (list: { m: string; n: number }[]) => list.find((x) => x.m === key)?.n ?? 0;
    return { key, month: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, uploaded: find(uploads), processed: find(extracted), verified: find(verified) };
  });

  // Last 14 days
  const dayStart = new Date();
  dayStart.setDate(dayStart.getDate() - 13);
  dayStart.setHours(0, 0, 0, 0);
  const dayIso = dayStart.toISOString();
  const dailyUploads = await rows<{ d: string; n: number }>(sql`
    select to_char(uploaded_at, 'YYYY-MM-DD') as d, count(*)::int as n from documents where uploaded_at >= ${dayIso} group by 1`);
  const dailyVerified = await rows<{ d: string; n: number }>(sql`
    select to_char(verified_at, 'YYYY-MM-DD') as d, count(*)::int as n from records where verified_at >= ${dayIso} group by 1`);
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(dayStart);
    d.setDate(dayStart.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      date: key,
      day: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      uploaded: dailyUploads.find((x) => x.d === key)?.n ?? 0,
      verified: dailyVerified.find((x) => x.d === key)?.n ?? 0,
    };
  });

  const taskStatus = await rows<{ status: string; n: number }>(sql`
    select status, count(*)::int as n from verification_tasks group by 1`);
  const n = (status: string) => taskStatus.find((t) => t.status === status)?.n ?? 0;
  const verificationChart = [
    { name: "Approved", value: n("APPROVED"), color: "#1a7f37" },
    { name: "Pending", value: n("PENDING") + n("IN_REVIEW"), color: "#e8750a" },
    { name: "Rejected", value: n("REJECTED"), color: "#dc2626" },
    { name: "Sent back", value: n("SENT_BACK"), color: "#64748b" },
  ];

  const validationStatus = await rows<{ status: string; n: number }>(sql`
    select coalesce(validation->>'validation_status','NONE') as status, count(*)::int as n from records group by 1`);
  const v = (status: string) => validationStatus.find((t) => t.status === status)?.n ?? 0;
  const validationChart = [
    { name: "Valid", value: v("VALID"), color: "#1a7f37" },
    { name: "Review required", value: v("REVIEW_REQUIRED"), color: "#e8750a" },
    { name: "Invalid", value: v("INVALID"), color: "#dc2626" },
  ];

  const recentDocs = await db.select().from(documents).orderBy(desc(documents.uploadedAt)).limit(6);
  const recentTasks = await db
    .select({ task: verificationTasks, record: records })
    .from(verificationTasks)
    .innerJoin(records, eq(records.id, verificationTasks.recordId))
    .where(inArray(verificationTasks.status, ["PENDING", "IN_REVIEW"]))
    .orderBy(desc(verificationTasks.updatedAt))
    .limit(6);
  const issues = await db
    .select()
    .from(records)
    .where(sql`${records.status} = 'VERIFICATION_REQUIRED' and ${records.validation}->>'validation_status' <> 'VALID'`)
    .orderBy(desc(records.updatedAt))
    .limit(6);

  return {
    stats,
    stateProgress,
    districtProgress,
    processingChart,
    dailyTrend,
    verificationChart,
    validationChart,
    recentDocuments: recentDocs.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      uploadedAt: iso(d.uploadedAt)!,
      uploadedBy: d.uploadedByName,
      district: d.district ?? undefined,
    })),
    recentVerification: recentTasks.map(({ task, record }) => ({
      id: task.id,
      recordId: task.recordId,
      ownerName: record.ownerName,
      action: task.status,
      priority: task.priority,
      actor: task.assignedTo ?? "Unassigned",
      timestamp: iso(task.updatedAt)!,
    })),
    recentValidationIssues: issues.map((r) => ({
      recordId: r.id,
      ownerName: r.ownerName,
      warnings: r.validation?.warnings ?? [],
      score: r.validation?.validation_score ?? 0,
    })),
    errorCategories: await errorCategories(),
  };
}


export async function errorCategories(): Promise<{ type: string; name: string; count: number }[]> {
  const list = await rows<{ type: string; n: number }>(sql`
    select type, count(*)::int as n from (
      select jsonb_array_elements(coalesce(validation->'warnings','[]'::jsonb))->>'type' as type from records
      union all
      select jsonb_array_elements(coalesce(validation->'errors','[]'::jsonb))->>'type' as type from records
    ) t where type is not null group by type order by n desc`);
  return list.map((r) => ({ type: r.type, name: ISSUE_LABELS[r.type] ?? r.type, count: r.n }));
}

export async function analyticsData() {
  const languages = await rows<{ lang: string; n: number }>(sql`
    select coalesce(detected_language, 'pending') as lang, count(*)::int as n from documents group by 1 order by n desc`);
  const recordTypes = await rows<{ type: string; n: number }>(sql`
    select coalesce(record_type, 'Unspecified') as type, count(*)::int as n from documents group by 1 order by n desc`);
  const fileTypes = await rows<{ type: string; n: number }>(sql`
    select file_type as type, count(*)::int as n from documents group by 1 order by n desc`);
  const stepTimings = await rows<{ key: string; label: string; avg_ms: number; n: number }>(sql`
    select s.v->>'key' as key, max(s.v->>'label') as label, avg((s.v->>'durationMs')::numeric)::int as avg_ms, count(*)::int as n
    from documents, jsonb_array_elements(steps) with ordinality as s(v, idx)
    where s.v->>'durationMs' is not null and s.v->>'status' = 'completed'
    group by 1 order by min(s.idx)`);
  const engines = await rows<{ engine: string; n: number }>(sql`
    select coalesce(ocr_engine, 'pending') as engine, count(*)::int as n from documents group by 1 order by n desc`);
  const quality = await rows<{ before: number | null; after: number | null; pages: number }>(sql`
    select avg((quality_before->>'score')::numeric)::int as before, avg((quality_after->>'score')::numeric)::int as after,
      count(*)::int as pages from document_pages where quality_before is not null`);
  const confidenceBuckets = await rows<{ bucket: string; n: number }>(sql`
    select case when average_confidence >= 0.9 then 'High (≥90%)' when average_confidence >= 0.75 then 'Medium (75–90%)'
      else 'Low (<75%)' end as bucket, count(*)::int as n from records group by 1`);

  return {
    languages: languages.map((l) => ({ code: l.lang, name: LANGUAGE_NAMES[l.lang.split("+")[0]] ?? l.lang, value: l.n })),
    recordTypes: recordTypes.map((r) => ({ type: r.type, count: r.n })),
    fileTypes: fileTypes.map((r) => ({ type: r.type, count: r.n })),
    stepTimings: stepTimings.map((s) => ({ key: s.key, label: s.label, avgSeconds: Math.round(s.avg_ms / 100) / 10, samples: s.n })),
    ocrEngines: engines.map((e) => ({ engine: e.engine, count: e.n })),
    imageQuality: quality[0] ?? { before: null, after: null, pages: 0 },
    confidenceBuckets: confidenceBuckets.map((b) => ({ bucket: b.bucket, count: b.n })),
    errorCategories: await errorCategories(),
    accuracy: await accuracyMetrics(),
  };
}

export interface AttentionItem {
  id: string;
  title: string;
  detail?: string;
  href: string;
  severity: "high" | "medium" | "info";
}

export interface Attention {
  items: AttentionItem[];
  oldestPendingHours: number | null;
  unsurveyedVerified: number | null;
}

/** Work items the signed-in user can act on, ordered by urgency. */
export async function attentionFor(user: { id: string; role: import("@/types").UserRole }): Promise<Attention> {
  const { hasPermission } = await import("@/lib/config");
  const { env } = await import("@/server/env");
  const items: AttentionItem[] = [];
  let oldestPendingHours: number | null = null;
  let unsurveyedVerified: number | null = null;

  if (hasPermission(user.role, "settings_admin")) {
    if (env.isProd && !env.certSigningKey && process.env.DHAROHAR_ALLOW_DEV_SECRETS !== "true") {
      items.push({ id: "cfg-cert", title: "Certificate signing key is not configured", detail: "Approvals will fail until CERT_SIGNING_KEY is set", href: "/integrations", severity: "high" });
    }
    if (env.geminiApiKey && !/^AIza[\w-]{30,}$/.test(env.geminiApiKey)) {
      items.push({ id: "cfg-gemini", title: "Gemini API key is invalid", detail: "Handwriting OCR is unavailable; Tesseract is used instead", href: "/integrations", severity: "medium" });
    }
    if (env.isServerless && !env.databaseUrl) {
      items.push({
        id: "cfg-db",
        title: "Database is temporary on this deployment",
        detail: "Set DATABASE_URL to a hosted PostgreSQL — each server instance has its own copy, so data and sign-ins are lost",
        href: "/integrations",
        severity: "high",
      });
    }
    if (env.isServerless && env.storageDriver !== "s3") {
      items.push({
        id: "cfg-storage",
        title: "Uploaded files are stored temporarily",
        detail: "Set STORAGE_DRIVER=s3 with an S3-compatible bucket so scans survive restarts",
        href: "/integrations",
        severity: "high",
      });
    }
    if (env.isProd && env.seedDemoUsers) {
      items.push({ id: "cfg-demo", title: "Training accounts are enabled in production", detail: "Set SEED_DEMO_USERS=false and deactivate demo users", href: "/users", severity: "high" });
    }
    const [jobs] = await rows<{ failed: number }>(sql`select count(*)::int as failed from jobs where status = 'failed'`);
    if (jobs?.failed) {
      items.push({ id: "jobs-failed", title: `${jobs.failed} background job(s) failed`, detail: "Check documents that failed processing", href: "/documents?status=FAILED", severity: "medium" });
    }
  }

  if (hasPermission(user.role, "documents")) {
    const failed = await rows<{ id: string; name: string; error: string | null }>(sql`
      select id, name, error from documents where status = 'FAILED' order by uploaded_at desc limit 5`);
    for (const d of failed) items.push({ id: `doc-${d.id}`, title: `Processing failed: ${d.name}`, detail: d.error ?? undefined, href: `/documents/${d.id}`, severity: "high" });
    const waiting = await rows<{ id: string; name: string }>(sql`
      select id, name from documents where status = 'UPLOADED' and uploaded_by = ${user.id} order by uploaded_at desc limit 5`);
    for (const d of waiting) items.push({ id: `up-${d.id}`, title: `Not processed yet: ${d.name}`, detail: "Review quality and start processing", href: `/documents/${d.id}/quality`, severity: "info" });
  }

  if (hasPermission(user.role, "verification")) {
    const tasks = await rows<{ record_id: string; owner_name: string; khasra_number: string; village: string; priority: string; created_at: string }>(sql`
      select t.record_id, r.owner_name, r.khasra_number, r.village, t.priority, t.created_at
      from verification_tasks t join records r on r.id = t.record_id
      where t.status in ('PENDING','IN_REVIEW')
      order by case t.priority when 'URGENT' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end, t.created_at
      limit 6`);
    for (const t of tasks) {
      items.push({
        id: `vt-${t.record_id}`,
        title: `Verify ${t.record_id}`,
        detail: [t.owner_name, t.khasra_number && `Khasra ${t.khasra_number}`, t.village].filter(Boolean).join(" · "),
        href: `/verification/${t.record_id}`,
        severity: t.priority === "URGENT" || t.priority === "HIGH" ? "high" : "medium",
      });
    }
    const [oldest] = await rows<{ created_at: string | null }>(sql`
      select min(created_at) as created_at from verification_tasks where status in ('PENDING','IN_REVIEW')`);
    if (oldest?.created_at) oldestPendingHours = Math.round((Date.now() - new Date(oldest.created_at).getTime()) / 3600000);
  }

  if (hasPermission(user.role, "claims")) {
    const [claims] = await rows<{ n: number }>(sql`select count(*)::int as n from citizen_claims where status = 'PENDING'`);
    if (claims?.n) items.push({ id: "claims", title: `${claims.n} ownership claim(s) to review`, href: "/claims", severity: "medium" });
  }

  if (hasPermission(user.role, "gis_edit")) {
    const unsurveyed = await rows<{ id: string; owner_name: string; khasra_number: string; village: string }>(sql`
      select r.id, r.owner_name, r.khasra_number, r.village from records r
      left join parcels p on p.record_id = r.id
      where r.status = 'VERIFIED' and coalesce(p.geometry_source, 'none') <> 'surveyed'
      order by r.verified_at desc limit 6`);
    const [count] = await rows<{ n: number }>(sql`
      select count(*)::int as n from records r left join parcels p on p.record_id = r.id
      where r.status = 'VERIFIED' and coalesce(p.geometry_source, 'none') <> 'surveyed'`);
    unsurveyedVerified = count?.n ?? 0;
    for (const r of unsurveyed) {
      items.push({
        id: `gis-${r.id}`,
        title: `Add boundary for ${r.id}`,
        detail: [`Khasra ${r.khasra_number}`, r.village, r.owner_name].filter(Boolean).join(" · "),
        href: `/gis?record=${r.id}`,
        severity: "info",
      });
    }
  }

  const order = { high: 0, medium: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return { items: items.slice(0, 12), oldestPendingHours, unsurveyedVerified };
}

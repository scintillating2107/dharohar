import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import { getDb, queryRows } from "@/server/db/client";
import { corrections } from "@/server/db/schema";
import { newId } from "@/server/crypto";
import type { ExtractedFieldValue } from "@/types";
import type { FewShotExample } from "@/server/pipeline/gemini";
import { normalizeDigits } from "@/server/pipeline/normalize";

/**
 * "Learning over time": every approval stores, per field, what the AI proposed and what the
 * officer finally accepted. Those pairs drive (1) few-shot examples in the extraction prompt,
 * (2) deterministic learned substitutions for recurring misreadings, (3) accuracy metrics,
 * and (4) an exportable fine-tuning dataset.
 */

function norm(value: string): string {
  return normalizeDigits(value).trim().replace(/\s+/g, " ").toLowerCase();
}

export async function recordCorrections(
  tx: DB,
  input: {
    recordId: string;
    aiFields: Record<string, ExtractedFieldValue>;
    finalFields: Record<string, ExtractedFieldValue>;
    district?: string | null;
    recordType?: string | null;
    language?: string | null;
    userId: string;
  }
): Promise<{ total: number; corrected: number }> {
  await tx.delete(corrections).where(eq(corrections.recordId, input.recordId));
  let total = 0;
  let corrected = 0;
  const keys = new Set([...Object.keys(input.aiFields), ...Object.keys(input.finalFields)]);
  for (const field of keys) {
    const ai = input.aiFields[field];
    const final = input.finalFields[field];
    // Only measure fields the AI actually read from the document
    if (!ai || ai.source === "metadata") continue;
    const aiValue = ai.aiValue ?? ai.value;
    const humanValue = final?.value ?? "";
    const accepted = norm(aiValue) === norm(humanValue);
    total += 1;
    if (!accepted) corrected += 1;
    await tx.insert(corrections).values({
      id: newId("CR"),
      recordId: input.recordId,
      field,
      aiValue,
      humanValue,
      accepted,
      source: ai.source ?? null,
      district: input.district ?? null,
      recordType: input.recordType ?? null,
      language: input.language ?? null,
      createdBy: input.userId,
    });
  }
  return { total, corrected };
}

/** Recent officer corrections, preferring the same district and record type. */
export async function fewShotExamples(opts: {
  district?: string | null;
  recordType?: string | null;
  limit?: number;
}): Promise<FewShotExample[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(corrections)
    .where(eq(corrections.accepted, false))
    .orderBy(
      desc(sql`(case when ${corrections.district} = ${opts.district ?? ""} then 1 else 0 end)
        + (case when ${corrections.recordType} = ${opts.recordType ?? ""} then 1 else 0 end)`),
      desc(corrections.createdAt)
    )
    .limit(60);
  const perField = new Map<string, number>();
  const out: FewShotExample[] = [];
  for (const row of rows) {
    if (!row.humanValue.trim()) continue;
    const n = perField.get(row.field) ?? 0;
    if (n >= 2) continue;
    perField.set(row.field, n + 1);
    out.push({ field: row.field, aiValue: row.aiValue, humanValue: row.humanValue });
    if (out.length >= (opts.limit ?? 10)) break;
  }
  return out;
}

export interface LearnedRule {
  field: string;
  from: string;
  to: string;
  count: number;
}

/** Misreadings officers corrected the same way at least twice, with no competing correction. */
export async function learnedRules(): Promise<LearnedRule[]> {
  const db = await getDb();
  const rows = await queryRows<{ field: string; ai_value: string; human_value: string; n: number }>(db, sql`
      select field, ai_value, human_value, count(*)::int as n
      from corrections
      where accepted = false and human_value <> ''
      group by field, ai_value, human_value
    `);

  const byKey = new Map<string, { to: string; n: number }[]>();
  for (const r of rows) {
    const key = `${r.field}\u0000${norm(r.ai_value)}`;
    const list = byKey.get(key) ?? [];
    list.push({ to: r.human_value, n: r.n });
    byKey.set(key, list);
  }
  const rules: LearnedRule[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => b.n - a.n);
    const top = list[0];
    const runnerUp = list[1]?.n ?? 0;
    if (top.n >= 2 && top.n > runnerUp) {
      const [field, from] = key.split("\u0000");
      rules.push({ field, from, to: top.to, count: top.n });
    }
  }
  return rules;
}

export function applyLearnedRules(
  fields: Record<string, ExtractedFieldValue>,
  rules: LearnedRule[]
): { fields: Record<string, ExtractedFieldValue>; applied: string[] } {
  const applied: string[] = [];
  const out = { ...fields };
  for (const rule of rules) {
    const f = out[rule.field];
    if (!f || norm(f.value) !== rule.from) continue;
    out[rule.field] = {
      ...f,
      value: rule.to,
      aiValue: f.value,
      source: "learned",
      confidence: Math.max(f.confidence, 0.85),
      note: `Learned from ${rule.count} officer corrections ("${f.value}" → "${rule.to}")`,
    };
    applied.push(rule.field);
  }
  return { fields: out, applied };
}

export interface AccuracyMetrics {
  overall: number | null;
  fieldsMeasured: number;
  byField: { field: string; total: number; accepted: number; accuracy: number }[];
  byMonth: { month: string; total: number; accepted: number; accuracy: number }[];
  bySource: { source: string; total: number; accepted: number; accuracy: number }[];
}

export async function accuracyMetrics(): Promise<AccuracyMetrics> {
  const db = await getDb();
  const pct = (a: number, t: number) => (t ? Math.round((a / t) * 1000) / 10 : 0);
  const byField = await queryRows<{ field: string; total: number; accepted: number }>(db, sql`
      select field, count(*)::int as total, sum(case when accepted then 1 else 0 end)::int as accepted
      from corrections group by field order by field
    `);
  const byMonth = await queryRows<{ month: string; total: number; accepted: number }>(db, sql`
      select to_char(created_at, 'YYYY-MM') as month, count(*)::int as total,
        sum(case when accepted then 1 else 0 end)::int as accepted
      from corrections group by 1 order by 1
    `);
  const bySource = await queryRows<{ source: string; total: number; accepted: number }>(db, sql`
      select coalesce(source, 'unknown') as source, count(*)::int as total,
        sum(case when accepted then 1 else 0 end)::int as accepted
      from corrections group by 1 order by 1
    `);
  const total = byField.reduce((s, r) => s + r.total, 0);
  const accepted = byField.reduce((s, r) => s + r.accepted, 0);
  return {
    overall: total ? pct(accepted, total) : null,
    fieldsMeasured: total,
    byField: byField.map((r) => ({ ...r, accuracy: pct(r.accepted, r.total) })),
    byMonth: byMonth.map((r) => ({ ...r, accuracy: pct(r.accepted, r.total) })),
    bySource: bySource.map((r) => ({ ...r, accuracy: pct(r.accepted, r.total) })),
  };
}

/** JSONL rows suitable for fine-tuning or evaluation of extraction models. */
export async function exportCorrectionsJsonl(): Promise<string> {
  const db = await getDb();
  const rows = await db.select().from(corrections).orderBy(corrections.createdAt);
  return rows
    .map((r) =>
      JSON.stringify({
        record_id: r.recordId,
        field: r.field,
        ai_value: r.aiValue,
        human_value: r.humanValue,
        accepted: r.accepted,
        source: r.source,
        district: r.district,
        record_type: r.recordType,
        language: r.language,
        created_at: r.createdAt,
      })
    )
    .join("\n");
}

export async function correctionsForRecord(recordId: string) {
  const db = await getDb();
  return db.select().from(corrections).where(and(eq(corrections.recordId, recordId)));
}

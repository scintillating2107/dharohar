import { asc, desc, eq, or, sql, type SQL } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { auditLog } from "@/server/db/schema";
import { canonicalJson, newId, sha256Hex } from "@/server/crypto";
import type { AuditActionType, AuditEvent } from "@/types";

/**
 * Tamper-evident audit log: every row stores the SHA-256 of (previous hash + canonical event).
 * Inserts are serialized with a transaction-scoped advisory lock so the chain never forks.
 */

export const GENESIS_HASH = "0".repeat(64);
const AUDIT_LOCK_KEY = 724001;

export interface AuditInput {
  action: AuditActionType;
  actor: string;
  actorName: string;
  documentId?: string | null;
  recordId?: string | null;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string | null;
}

type AuditRow = typeof auditLog.$inferSelect;

export function hashAuditEvent(prevHash: string, row: Omit<AuditRow, "seq" | "hash" | "prevHash">): string {
  return sha256Hex(
    prevHash +
      canonicalJson({
        id: row.id,
        ts: new Date(row.ts).toISOString(),
        actor: row.actor,
        actorName: row.actorName,
        action: row.action,
        documentId: row.documentId ?? null,
        recordId: row.recordId ?? null,
        field: row.field ?? null,
        oldValue: row.oldValue ?? null,
        newValue: row.newValue ?? null,
        details: row.details ?? null,
      })
  );
}

async function insertChained(tx: DB, input: AuditInput): Promise<AuditRow> {
  await tx.execute(sql`select pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`);
  const [last] = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.seq)).limit(1);
  const prevHash = last?.hash ?? GENESIS_HASH;
  const base = {
    id: newId("AE"),
    ts: new Date().toISOString(),
    actor: input.actor,
    actorName: input.actorName,
    action: input.action,
    documentId: input.documentId ?? null,
    recordId: input.recordId ?? null,
    field: input.field ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    details: input.details ?? null,
  };
  const hash = hashAuditEvent(prevHash, base);
  const [row] = await tx.insert(auditLog).values({ ...base, prevHash, hash }).returning();
  return row;
}

/** Appends an audit event. Pass a transaction to make it atomic with other writes. */
export async function appendAudit(input: AuditInput, tx?: DB): Promise<AuditEvent> {
  if (tx) return toAuditEvent(await insertChained(tx, input));
  const db = await getDb();
  const row = await db.transaction(async (t) => insertChained(t as unknown as DB, input));
  return toAuditEvent(row);
}

export function toAuditEvent(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    seq: row.seq,
    timestamp: new Date(row.ts).toISOString(),
    actor: row.actor,
    actorName: row.actorName,
    action: row.action as AuditActionType,
    documentId: row.documentId ?? undefined,
    recordId: row.recordId ?? undefined,
    field: row.field ?? undefined,
    oldValue: row.oldValue ?? undefined,
    newValue: row.newValue ?? undefined,
    details: row.details ?? undefined,
    hash: row.hash,
    prevHash: row.prevHash,
  };
}

export async function listAudit(filter: {
  recordId?: string;
  documentId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AuditEvent[]; total: number }> {
  const db = await getDb();
  const conds: SQL[] = [];
  if (filter.recordId) conds.push(eq(auditLog.recordId, filter.recordId));
  if (filter.documentId) conds.push(eq(auditLog.documentId, filter.documentId));
  const where = conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : or(...conds);
  const rows = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.seq))
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(where);
  return { items: rows.map(toAuditEvent), total: count };
}

export async function auditHead(): Promise<string | null> {
  const db = await getDb();
  const [last] = await db.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.seq)).limit(1);
  return last?.hash ?? null;
}

export interface ChainVerification {
  valid: boolean;
  checked: number;
  brokenAtSeq?: number;
  head: string | null;
}

/** Recomputes every hash in order. Any edited, inserted or deleted row breaks the chain. */
export async function verifyAuditChain(): Promise<ChainVerification> {
  const db = await getDb();
  let prev = GENESIS_HASH;
  let checked = 0;
  const pageSize = 1000;
  let lastSeq = 0;
  for (;;) {
    const rows = await db
      .select()
      .from(auditLog)
      .where(sql`${auditLog.seq} > ${lastSeq}`)
      .orderBy(asc(auditLog.seq))
      .limit(pageSize);
    if (rows.length === 0) break;
    for (const row of rows) {
      const expected = hashAuditEvent(prev, row);
      if (row.prevHash !== prev || row.hash !== expected) {
        return { valid: false, checked, brokenAtSeq: row.seq, head: prev };
      }
      prev = row.hash;
      checked += 1;
      lastSeq = row.seq;
    }
  }
  return { valid: true, checked, head: checked ? prev : null };
}

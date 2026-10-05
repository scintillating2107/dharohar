import { and, eq, sql } from "drizzle-orm";
import { hostname } from "os";
import { getDb, queryRows } from "@/server/db/client";
import { jobs } from "@/server/db/schema";
import { newId } from "@/server/crypto";
import { env } from "@/server/env";

/**
 * Durable job queue on Postgres. Jobs are claimed with `FOR UPDATE SKIP LOCKED`, so several
 * workers (or web instances) can run safely. Failed jobs are retried with backoff; jobs whose
 * worker died are recovered after LOCK_TIMEOUT_MS.
 */

/** Throw this from a handler for failures that retrying cannot fix. */
export class PermanentJobError extends Error {
  permanent = true;
}

export type JobType = "process_document" | "deliver_webhook" | "send_email" | "send_sms";

type Handler = (payload: Record<string, unknown>, job: { id: string; attempts: number }) => Promise<void>;

const handlers = new Map<JobType, Handler>();
const WORKER_ID = `${hostname()}:${process.pid}`;
const LOCK_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 2000;

export function registerJobHandler(type: JobType, handler: Handler): void {
  handlers.set(type, handler);
}

export async function enqueueJob(
  type: JobType,
  payload: Record<string, unknown>,
  opts: { maxAttempts?: number; delayMs?: number } = {}
): Promise<string> {
  const db = await getDb();
  const id = newId("JOB");
  await db.insert(jobs).values({
    id,
    type,
    payload,
    maxAttempts: opts.maxAttempts ?? 3,
    runAfter: new Date(Date.now() + (opts.delayMs ?? 0)).toISOString(),
  });
  wakeWorker();
  return id;
}

/** True when a job of this type for this document is already queued or running. */
export async function hasActiveJob(type: JobType, documentId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.type, type),
        sql`${jobs.status} in ('queued','running')`,
        sql`${jobs.payload}->>'documentId' = ${documentId}`
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function claimJob() {
  const db = await getDb();
  const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
  await db
    .update(jobs)
    .set({ status: "queued", lockedAt: null, lockedBy: null })
    .where(and(eq(jobs.status, "running"), sql`${jobs.lockedAt} < ${staleBefore}`));

  const rows = await queryRows<{ id: string; type: JobType; payload: Record<string, unknown>; attempts: number; max_attempts: number }>(db, sql`
    update jobs set status = 'running', locked_at = now(), locked_by = ${WORKER_ID},
      attempts = attempts + 1, updated_at = now()
    where id = (
      select id from jobs
      where status = 'queued' and run_after <= now()
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, type, payload, attempts, max_attempts
  `);
  return rows[0] ?? null;
}

async function runJob(job: NonNullable<Awaited<ReturnType<typeof claimJob>>>): Promise<void> {
  const db = await getDb();
  const handler = handlers.get(job.type);
  try {
    if (!handler) throw new Error(`No handler registered for job type ${job.type}`);
    await handler(job.payload, { id: job.id, attempts: job.attempts });
    await db
      .update(jobs)
      .set({ status: "done", lockedAt: null, lastError: null, updatedAt: new Date().toISOString() })
      .where(eq(jobs.id, job.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const permanent = Boolean((err as { permanent?: boolean })?.permanent);
    const retry = !permanent && job.attempts < job.max_attempts;
    const backoff = Math.min(10 * 60_000, 15_000 * 2 ** (job.attempts - 1));
    await db
      .update(jobs)
      .set({
        status: retry ? "queued" : "failed",
        lockedAt: null,
        lockedBy: null,
        lastError: message.slice(0, 2000),
        runAfter: new Date(Date.now() + (retry ? backoff : 0)).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, job.id));
    console.error(`[jobs] ${job.type} ${job.id} failed (attempt ${job.attempts}/${job.max_attempts}):`, message);
  }
}

/** Runs queued jobs until the queue is empty (or `maxJobs` reached). */
export async function drainJobs(maxJobs = 50): Promise<number> {
  await import("@/server/job-handlers");
  let count = 0;
  while (count < maxJobs) {
    const job = await claimJob();
    if (!job) break;
    await runJob(job);
    count += 1;
  }
  return count;
}

declare global {
  var __dharoharWorker: { running: boolean; timer?: NodeJS.Timeout; busy: boolean } | undefined;
}

function wakeWorker(): void {
  const w = global.__dharoharWorker;
  if (!w?.running || w.busy) return;
  if (w.timer) clearTimeout(w.timer);
  w.timer = setTimeout(tick, 0);
}

async function tick(): Promise<void> {
  const w = global.__dharoharWorker;
  if (!w?.running) return;
  if (w.busy) return;
  w.busy = true;
  try {
    await drainJobs();
  } catch (err) {
    console.error("[jobs] worker tick failed:", err);
  } finally {
    w.busy = false;
    if (w.running) w.timer = setTimeout(tick, POLL_MS);
  }
}

/** Starts the polling worker in this process (idempotent). */
export function startWorker(): void {
  if (global.__dharoharWorker?.running) return;
  global.__dharoharWorker = { running: true, busy: false };
  global.__dharoharWorker.timer = setTimeout(tick, 500);
  console.log(`[jobs] worker started (${WORKER_ID})`);
}

export function stopWorker(): void {
  const w = global.__dharoharWorker;
  if (!w) return;
  w.running = false;
  if (w.timer) clearTimeout(w.timer);
}

export function inlineWorkerEnabled(): boolean {
  return env.workerMode === "inline";
}

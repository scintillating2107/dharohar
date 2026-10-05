import { sql } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb, getDbDriver, queryRows } from "@/server/db/client";
import { env, geminiEnabled } from "@/server/env";
import { publicKeyInfo } from "@/server/certification";
import { handle, ok } from "@/server/http";

async function probe(url: string): Promise<"up" | "down"> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? "up" : "down";
  } catch {
    return "down";
  }
}

/** Live status of every subsystem the pipeline depends on. */
export const GET = handle(async () => {
  await requireUser("integrations");
  const db = await getDb();
  const jobs = await queryRows<{ status: string; n: number }>(db, sql`select status, count(*)::int as n from jobs group by status`);
  const key = await publicKeyInfo().catch((err: Error) => ({ keyId: "unavailable", source: err.message }));

  return ok({
    database: { driver: await getDbDriver(), status: "up" },
    storage: { driver: env.storageDriver },
    worker: {
      mode: env.isServerless ? "serverless (after-response drain)" : env.workerMode,
      running: Boolean(global.__dharoharWorker?.running),
      jobs: Object.fromEntries(jobs.map((j) => [j.status, j.n])),
    },
    ocr: {
      engine: env.ocrEngine,
      tesseract: "enabled (word boxes, OSD script & orientation)",
      gemini: !env.geminiApiKey
        ? "not configured"
        : !/^AIza[\w-]{30,}$/.test(env.geminiApiKey)
          ? "GEMINI_API_KEY does not look like a Gemini API key (expected AIza…); calls will fail and fall back to Tesseract"
          : geminiEnabled()
            ? `enabled (${env.geminiModel})`
            : "disabled by OCR_ENGINE",
    },
    mlService: env.mlServiceUrl ? { url: env.mlServiceUrl, status: await probe(env.mlServiceUrl) } : null,
    certification: { keyId: key.keyId, keySource: key.source },
    notifications: { email: env.smtp.host ? "SMTP configured" : "not configured", sms: env.smsWebhookUrl ? "gateway configured" : "not configured" },
    geocoder: env.geocoder,
  });
});

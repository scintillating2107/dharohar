import { after } from "next/server";
import { env } from "@/server/env";
import { drainJobs } from "@/server/jobs";

/**
 * On serverless hosts there is no long-lived worker, so the request that enqueued work drains
 * the queue after responding (bounded by the route's maxDuration). Elsewhere the inline or
 * external worker picks jobs up.
 */
export function scheduleJobRun(): void {
  if (!env.isServerless) return;
  after(async () => {
    try {
      await drainJobs(5);
    } catch (err) {
      console.error("[jobs] serverless drain failed:", err);
    }
  });
}

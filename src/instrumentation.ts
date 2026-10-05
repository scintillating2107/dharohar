export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production" && !process.env.CERT_SIGNING_KEY && process.env.DHAROHAR_ALLOW_DEV_SECRETS !== "true") {
    console.warn("[dharohar] CERT_SIGNING_KEY is not set: records cannot be approved/certified. Run `npm run secrets`.");
  }
  // Serverless platforms run the queue via after() in the enqueueing request instead
  if (process.env.VERCEL === "1" || process.env.WORKER_MODE === "external") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startWorker } = await import("@/server/jobs");
  await import("@/server/job-handlers");
  startWorker();
}

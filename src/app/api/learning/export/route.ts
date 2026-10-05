import { requireUser } from "@/server/auth";
import { exportCorrectionsJsonl } from "@/server/learning";
import { handle } from "@/server/http";

/** Downloads officer corrections as JSONL (evaluation / fine-tuning dataset). */
export const GET = handle(async () => {
  await requireUser("analytics");
  const body = await exportCorrectionsJsonl();
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="dharohar-corrections-${new Date().toISOString().slice(0, 10)}.jsonl"`,
    },
  });
});

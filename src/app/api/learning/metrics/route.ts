import { requireUser } from "@/server/auth";
import { accuracyMetrics, learnedRules } from "@/server/learning";
import { handle, ok } from "@/server/http";

export const GET = handle(async () => {
  await requireUser("analytics");
  const [metrics, rules] = await Promise.all([accuracyMetrics(), learnedRules()]);
  return ok({ ...metrics, learnedRules: rules });
});

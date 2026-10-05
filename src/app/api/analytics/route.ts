import { requireUser } from "@/server/auth";
import { analyticsData, dashboardData } from "@/server/analytics";
import { handle, ok } from "@/server/http";

export const GET = handle(async () => {
  await requireUser("analytics");
  const [analytics, dashboard] = await Promise.all([analyticsData(), dashboardData()]);
  return ok({ ...analytics, stats: dashboard.stats, districtProgress: dashboard.districtProgress, processingChart: dashboard.processingChart });
});

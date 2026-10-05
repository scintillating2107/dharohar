import { requireUser } from "@/server/auth";
import { attentionFor, dashboardData } from "@/server/analytics";
import { handle, ok } from "@/server/http";

export const GET = handle(async () => {
  const user = await requireUser("dashboard");
  const [data, attention] = await Promise.all([dashboardData(), attentionFor(user)]);
  return ok({ ...data, attention });
});

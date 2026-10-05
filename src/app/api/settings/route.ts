import { requireUser } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { handle, ok } from "@/server/http";

/** Effective system thresholds (read-only for every signed-in user; used for UI badges). */
export const GET = handle(async () => {
  await requireUser();
  return ok({ settings: await getSettings() });
});

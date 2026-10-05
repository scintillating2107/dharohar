import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getSettings, updateSettings } from "@/server/settings";
import { handle, ok } from "@/server/http";

export const GET = handle(async () => {
  await requireUser("settings_admin");
  return ok({ settings: await getSettings() });
});

export const PUT = handle(async (request: Request) => {
  const admin = await requireUser("settings_admin");
  const before = await getSettings();
  const next = await updateSettings(await request.json(), admin.id);
  const changed = (Object.keys(next) as (keyof typeof next)[])
    .filter((k) => next[k] !== before[k])
    .map((k) => `${k}: ${before[k]} → ${next[k]}`);
  if (changed.length) {
    await appendAudit({ action: "SETTINGS_UPDATED", actor: admin.id, actorName: admin.name, details: changed.join("; ") });
  }
  return ok({ settings: next });
});

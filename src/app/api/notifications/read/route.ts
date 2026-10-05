import { requireUser } from "@/server/auth";
import { markNotificationsRead } from "@/server/notifications";
import { handle, ok } from "@/server/http";

export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : undefined;
  await markNotificationsRead(user.id, ids);
  return ok({ read: true });
});

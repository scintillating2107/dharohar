import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const user = store.users.find((u) => u.id === session.userId);
  if (!user) return unauthorized();

  return apiSuccess({ user });
}

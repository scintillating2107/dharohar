import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { webhooks } from "@/server/db/schema";
import { fail, handle, ok } from "@/server/http";

/** Enables or disables a webhook subscription. */
export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser("integrations");
  const { id } = await ctx.params;
  const { active } = await request.json();
  const db = await getDb();
  const [row] = await db.update(webhooks).set({ active: Boolean(active) }).where(eq(webhooks.id, id)).returning();
  if (!row) return fail("Webhook not found", 404);
  return ok({ id, active: row.active });
});

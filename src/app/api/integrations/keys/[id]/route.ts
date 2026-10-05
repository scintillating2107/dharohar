import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb } from "@/server/db/client";
import { apiKeys } from "@/server/db/schema";
import { fail, handle, ok } from "@/server/http";

/** Revokes a key (kept for audit; it can no longer authenticate). */
export const DELETE = handle(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireUser("integrations");
  const { id } = await ctx.params;
  const db = await getDb();
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
  if (!key) return fail("Key not found", 404);
  if (!key.revokedAt) {
    await db.update(apiKeys).set({ revokedAt: new Date().toISOString() }).where(eq(apiKeys.id, id));
    await appendAudit({ action: "API_KEY_REVOKED", actor: admin.id, actorName: admin.name, details: `${key.name} (${key.prefix})` });
  }
  return ok({ revoked: true });
});

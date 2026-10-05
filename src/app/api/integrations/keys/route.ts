import { desc } from "drizzle-orm";
import { API_SCOPES, generateApiKey, requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { newId } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { apiKeys } from "@/server/db/schema";
import { iso } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";
import type { ApiKeyInfo } from "@/types";

export const GET = handle(async () => {
  await requireUser("integrations");
  const db = await getDb();
  const rows = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  const items: ApiKeyInfo[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    scopes: r.scopes,
    createdAt: iso(r.createdAt)!,
    lastUsedAt: iso(r.lastUsedAt) ?? null,
    revokedAt: iso(r.revokedAt) ?? null,
  }));
  return ok({ items, scopes: API_SCOPES });
});

/** Creates a key for an external system. The full key is returned exactly once. */
export const POST = handle(async (request: Request) => {
  const admin = await requireUser("integrations");
  const { name, scopes } = await request.json();
  if (!name?.trim()) return fail("Name is required");
  const chosen = Array.isArray(scopes) ? scopes.filter((s: string) => (API_SCOPES as readonly string[]).includes(s)) : [];
  if (!chosen.length) return fail("Select at least one scope");
  const { key, prefix, hash } = generateApiKey();
  const db = await getDb();
  const id = newId("KEY");
  await db.insert(apiKeys).values({ id, name: String(name).trim().slice(0, 100), prefix, keyHash: hash, scopes: chosen, createdBy: admin.id });
  await appendAudit({ action: "API_KEY_CREATED", actor: admin.id, actorName: admin.name, details: `${name} (${prefix}, ${chosen.join(", ")})` });
  return ok({ id, key, prefix });
});

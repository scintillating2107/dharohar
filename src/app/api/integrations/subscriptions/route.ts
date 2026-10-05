import { desc } from "drizzle-orm";
import { requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { newId, randomToken } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { webhooks } from "@/server/db/schema";
import { WEBHOOK_EVENTS } from "@/server/webhooks";
import { iso } from "@/server/repo";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import type { WebhookInfo } from "@/types";

export const GET = handle(async () => {
  await requireUser("integrations");
  const db = await getDb();
  const rows = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  const items: WebhookInfo[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    events: r.events,
    active: r.active,
    createdAt: iso(r.createdAt)!,
    lastDeliveryAt: iso(r.lastDeliveryAt) ?? null,
    lastStatus: r.lastStatus,
  }));
  return ok({ items, events: WEBHOOK_EVENTS });
});

/** Registers an outbound webhook. The signing secret is returned exactly once. */
export const POST = handle(async (request: Request) => {
  const admin = await requireUser("integrations");
  const { url, events } = await request.json();
  let parsed: URL;
  try {
    parsed = new URL(String(url));
  } catch {
    return fail("Enter a valid URL");
  }
  if (parsed.protocol !== "https:" && (env.isProd || parsed.protocol !== "http:")) return fail("Webhook URL must use HTTPS");
  const chosen = Array.isArray(events) ? events.filter((e: string) => (WEBHOOK_EVENTS as readonly string[]).includes(e)) : [];
  if (!chosen.length) return fail("Select at least one event");
  const id = newId("WH");
  const secret = `whsec_${randomToken(24)}`;
  const db = await getDb();
  await db.insert(webhooks).values({ id, url: parsed.toString(), secret, events: chosen, createdBy: admin.id });
  await appendAudit({ action: "WEBHOOK_CREATED", actor: admin.id, actorName: admin.name, details: `${parsed.toString()} (${chosen.join(", ")})` });
  return ok({ id, secret });
});

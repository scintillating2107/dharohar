import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { webhooks } from "@/server/db/schema";
import { enqueueJob } from "@/server/jobs";
import { newId } from "@/server/crypto";

export const WEBHOOK_EVENTS = ["record.verified", "record.rejected", "record.extracted", "parcel.updated"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Queues a signed delivery to every active subscriber of `event`. */
export async function emitWebhookEvent(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  const subs = await db.select().from(webhooks).where(eq(webhooks.active, true));
  for (const sub of subs) {
    if (!sub.events.includes(event) && !sub.events.includes("*")) continue;
    await enqueueJob(
      "deliver_webhook",
      {
        webhookId: sub.id,
        deliveryId: newId("WD"),
        event,
        occurredAt: new Date().toISOString(),
        data,
      },
      { maxAttempts: 6 }
    );
  }
}

export function signWebhookBody(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export async function deliverWebhook(payload: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  const [sub] = await db.select().from(webhooks).where(eq(webhooks.id, String(payload.webhookId)));
  if (!sub || !sub.active) return;
  const body = JSON.stringify({
    id: payload.deliveryId,
    event: payload.event,
    occurred_at: payload.occurredAt,
    data: payload.data,
  });
  let status = "network error";
  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Dharohar-Webhooks/1.0",
        "X-Dharohar-Event": String(payload.event),
        "X-Dharohar-Delivery": String(payload.deliveryId),
        "X-Dharohar-Signature": signWebhookBody(sub.secret, body),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    status = `${res.status}`;
    if (!res.ok) throw new Error(`Webhook ${sub.url} responded ${res.status}`);
  } finally {
    await db
      .update(webhooks)
      .set({ lastDeliveryAt: new Date().toISOString(), lastStatus: status })
      .where(eq(webhooks.id, sub.id));
  }
}

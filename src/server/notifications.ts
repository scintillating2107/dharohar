import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import { newId } from "@/server/crypto";
import { enqueueJob } from "@/server/jobs";
import { env } from "@/server/env";
import type { AppNotification, UserRole } from "@/types";

export interface NotificationInput {
  title: string;
  body?: string;
  link?: string;
}

/** Creates in-app notifications and queues email/SMS according to each user's preferences. */
export async function notifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  if (userIds.length === 0) return;
  const db = await getDb();
  const recipients = await db.select().from(users).where(inArray(users.id, userIds));
  for (const user of recipients) {
    if (!user.active) continue;
    const prefs = user.notificationPrefs ?? { email: true, sms: false, inApp: true };
    if (prefs.inApp) {
      await db.insert(notifications).values({
        id: newId("NT"),
        userId: user.id,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      });
    }
    if (prefs.email && env.smtp.host) {
      await enqueueJob("send_email", {
        to: user.email,
        subject: `[Dharohar] ${input.title}`,
        text: `${input.body ?? input.title}${input.link ? `\n\n${env.appUrl}${input.link}` : ""}`,
      });
    }
    if (prefs.sms && user.phone && env.smsWebhookUrl) {
      await enqueueJob("send_sms", { to: user.phone, message: `Dharohar: ${input.title}` });
    }
  }
}

export async function notifyRoles(roles: UserRole[], input: NotificationInput, district?: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, district: users.district })
    .from(users)
    .where(and(inArray(users.role, roles), eq(users.active, true)));
  const ids = rows
    .filter((u) => !district || !u.district || u.district.toLowerCase() === district.toLowerCase())
    .map((u) => u.id);
  await notifyUsers(ids, input);
}

export async function listNotifications(userId: string, limit = 20): Promise<{
  items: AppNotification[];
  unread: number;
}> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body ?? undefined,
      link: r.link ?? undefined,
      readAt: r.readAt ? new Date(r.readAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
    unread: count,
  };
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const where = ids?.length
    ? and(eq(notifications.userId, userId), inArray(notifications.id, ids))
    : and(eq(notifications.userId, userId), isNull(notifications.readAt));
  await db.update(notifications).set({ readAt: now }).where(where);
}

export async function sendEmail(payload: { to: string; subject: string; text: string }): Promise<void> {
  if (!env.smtp.host) throw new Error("SMTP_HOST is not configured");
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  await transport.sendMail({ from: env.smtp.from, to: payload.to, subject: payload.subject, text: payload.text });
}

/** Generic SMS gateway adapter: POSTs {to, message} to SMS_WEBHOOK_URL. */
export async function sendSms(payload: { to: string; message: string }): Promise<void> {
  if (!env.smsWebhookUrl) throw new Error("SMS_WEBHOOK_URL is not configured");
  const res = await fetch(env.smsWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`SMS gateway responded ${res.status}`);
}

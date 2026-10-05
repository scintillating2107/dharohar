import { eq } from "drizzle-orm";
import { clearSessionCookie, getSessionUser, requireUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getUserRow, toUser } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

export const GET = handle(async () => {
  const user = await getSessionUser();
  if (!user) {
    // A signed cookie whose user no longer exists or is deactivated: drop it, so the page
    // middleware stops treating the browser as signed in and the login page can load.
    await clearSessionCookie();
    return fail("Unauthorized", 401);
  }
  return ok({ user });
});

/** Update own profile: phone and notification preferences. */
export const PATCH = handle(async (request: Request) => {
  const user = await requireUser();
  const body = await request.json();
  const patch: Partial<typeof users.$inferInsert> = {};
  if (body.phone !== undefined) {
    const phone = String(body.phone ?? "").trim();
    if (phone && !/^\+?\d[\d\s-]{7,15}$/.test(phone)) return fail("Enter a valid phone number");
    patch.phone = phone || null;
  }
  if (body.notificationPrefs) {
    patch.notificationPrefs = {
      email: Boolean(body.notificationPrefs.email),
      sms: Boolean(body.notificationPrefs.sms),
      inApp: Boolean(body.notificationPrefs.inApp),
    };
  }
  const db = await getDb();
  if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, user.id));
  return ok({ user: toUser((await getUserRow(user.id))!) });
});

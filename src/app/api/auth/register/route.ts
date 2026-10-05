import { eq } from "drizzle-orm";
import { clientIp, createSessionToken, hashPassword, passwordProblem, setSessionCookie } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { newId } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getUserRow, toUser } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

/** Citizen self-registration. Officer accounts are created by administrators. */
export const POST = handle(async (request: Request) => {
  const { name, email, password, district, phone } = await request.json();
  if (!name?.trim() || !email?.trim() || !password) return fail("Name, email, and password are required");
  const normalized = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return fail("Enter a valid email address");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized));
  if (existing) return fail("An account with this email already exists", 409);

  const id = newId("U");
  await db.insert(users).values({
    id,
    email: normalized,
    name: String(name).trim().slice(0, 120),
    role: "CITIZEN",
    district: district?.trim() || null,
    phone: phone?.trim() || null,
    passwordHash: await hashPassword(password),
    notificationPrefs: { email: true, sms: false, inApp: true },
  });
  const user = toUser((await getUserRow(id))!);
  await appendAudit({ action: "USER_CREATED", actor: id, actorName: user.name, details: `Citizen self-registration from ${clientIp(request)}` });
  await setSessionCookie(await createSessionToken(user));
  return ok({ user }, { message: "Registration successful" });
});

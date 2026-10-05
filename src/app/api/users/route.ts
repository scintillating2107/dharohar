import { asc, eq } from "drizzle-orm";
import { hashPassword, passwordProblem, requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { newId } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getUserRow, toUser } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";
import { ROLE_PERMISSIONS } from "@/lib/config";
import type { UserRole } from "@/types";

export const GET = handle(async () => {
  await requireUser("users");
  const db = await getDb();
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  return ok({ users: rows.map(toUser) });
});

export const POST = handle(async (request: Request) => {
  const admin = await requireUser("users");
  const { email, name, role, password, district, phone } = await request.json();
  if (!email?.trim() || !name?.trim() || !role || !password) return fail("Name, email, role and password are required");
  if (!(role in ROLE_PERMISSIONS)) return fail("Unknown role");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  const normalized = String(email).trim().toLowerCase();
  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized));
  if (existing) return fail("A user with this email already exists", 409);
  const id = newId("U");
  await db.insert(users).values({
    id,
    email: normalized,
    name: String(name).trim(),
    role: role as UserRole,
    district: district?.trim() || null,
    phone: phone?.trim() || null,
    passwordHash: await hashPassword(password),
    notificationPrefs: { email: true, sms: false, inApp: true },
  });
  await appendAudit({
    action: "USER_CREATED",
    actor: admin.id,
    actorName: admin.name,
    details: `${normalized} as ${role}`,
  });
  return ok({ user: toUser((await getUserRow(id))!) });
});

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { hashPassword, passwordProblem, requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getUserRow } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";

export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const { currentPassword, newPassword } = await request.json();
  const row = await getUserRow(user.id);
  if (!row || !(await bcrypt.compare(String(currentPassword ?? ""), row.passwordHash))) {
    return fail("Current password is incorrect", 400);
  }
  const problem = passwordProblem(newPassword);
  if (problem) return fail(problem);
  const db = await getDb();
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, user.id));
  await appendAudit({ action: "PASSWORD_CHANGED", actor: user.id, actorName: user.name });
  return ok({ changed: true });
});

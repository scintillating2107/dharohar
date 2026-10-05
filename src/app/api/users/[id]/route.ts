import { eq } from "drizzle-orm";
import { hashPassword, passwordProblem, requireUser } from "@/server/auth";
import { appendAudit } from "@/server/audit";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getUserRow, toUser } from "@/server/repo";
import { fail, handle, ok } from "@/server/http";
import { ROLE_PERMISSIONS } from "@/lib/config";
import type { UserRole } from "@/types";

/** Admin updates: role, district, phone, activation, password reset, unlock. */
export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireUser("users");
  const { id } = await ctx.params;
  const target = await getUserRow(id);
  if (!target) return fail("User not found", 404);
  const body = await request.json();
  const patch: Partial<typeof users.$inferInsert> = {};
  const changes: string[] = [];

  if (body.role !== undefined && body.role !== target.role) {
    if (!(body.role in ROLE_PERMISSIONS)) return fail("Unknown role");
    if (id === admin.id) return fail("You cannot change your own role");
    patch.role = body.role as UserRole;
    changes.push(`role ${target.role} → ${body.role}`);
  }
  if (body.active !== undefined && Boolean(body.active) !== target.active) {
    if (id === admin.id) return fail("You cannot deactivate your own account");
    patch.active = Boolean(body.active);
    changes.push(patch.active ? "activated" : "deactivated");
  }
  if (body.district !== undefined) {
    patch.district = String(body.district).trim() || null;
    changes.push(`district ${patch.district ?? "—"}`);
  }
  if (body.phone !== undefined) patch.phone = String(body.phone).trim() || null;
  if (body.password) {
    const problem = passwordProblem(body.password);
    if (problem) return fail(problem);
    patch.passwordHash = await hashPassword(body.password);
    patch.failedLogins = 0;
    patch.lockedUntil = null;
    changes.push("password reset");
  }
  if (body.unlock) {
    patch.failedLogins = 0;
    patch.lockedUntil = null;
    changes.push("unlocked");
  }
  if (!Object.keys(patch).length) return ok({ user: toUser(target) });

  const db = await getDb();
  await db.update(users).set(patch).where(eq(users.id, id));
  await appendAudit({
    action: "USER_UPDATED",
    actor: admin.id,
    actorName: admin.name,
    details: `${target.email}: ${changes.join(", ")}`,
  });
  return ok({ user: toUser((await getUserRow(id))!) });
});

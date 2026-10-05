import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { timingSafeEqual } from "crypto";
import { getDb } from "@/server/db/client";
import { apiKeys, loginAttempts, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { sha256Hex } from "@/server/crypto";
import { appendAudit } from "@/server/audit";
import { toUser, type UserRow } from "@/server/repo";
import { hasPermission, type Permission } from "@/lib/config";
import type { User, UserRole } from "@/types";

export const SESSION_COOKIE = "dharohar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const secret = () => new TextEncoder().encode(env.jwtSecret);

let dummy: string | null = null;
const dummyHash = () => (dummy ??= bcrypt.hashSync("timing-equalizer", 10));

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const IP_WINDOW_MINUTES = 15;
const MAX_IP_FAILURES = 30;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export function passwordProblem(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain letters and numbers";
  return null;
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSessionToken(user: Pick<User, "id" | "role">): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The signed-in user, re-read from the database (deactivated users lose access immediately). */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const db = await getDb();
    const [row] = await db.select().from(users).where(eq(users.id, payload.sub));
    if (!row || !row.active) return null;
    return toUser(row);
  } catch {
    return null;
  }
}

/** Throws HttpError(401/403) unless a user with the given permission is signed in. */
export async function requireUser(permission?: Permission, roles?: UserRole[]): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Unauthorized");
  if (permission && !hasPermission(user.role, permission)) throw new HttpError(403, "Forbidden");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "Forbidden");
  return user;
}

// ---------------------------------------------------------------------------
// Login with throttling and lockout
// ---------------------------------------------------------------------------

export async function authenticate(emailInput: string, password: string, ip: string): Promise<User> {
  const db = await getDb();
  const email = String(emailInput ?? "").trim().toLowerCase();
  const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60_000).toISOString();
  const [{ failures }] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  if (failures >= MAX_IP_FAILURES) {
    throw new HttpError(429, "Too many failed sign-in attempts from this network. Try again later.");
  }

  const [row] = await db.select().from(users).where(eq(users.email, email));
  const fail = async (message = "Invalid email or password", userRow?: UserRow) => {
    await db.insert(loginAttempts).values({ ip, email, success: false });
    if (userRow) {
      const failed = userRow.failedLogins + 1;
      await db
        .update(users)
        .set({
          failedLogins: failed,
          lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
        })
        .where(eq(users.id, userRow.id));
      if (failed >= MAX_FAILED_LOGINS) {
        await appendAudit({
          action: "USER_LOGIN_FAILED",
          actor: userRow.id,
          actorName: userRow.name,
          details: `Account locked for ${LOCK_MINUTES} minutes after ${failed} failed attempts`,
        });
      }
    }
    throw new HttpError(401, message);
  };

  if (!row || !row.active) {
    // Equalize timing with a real comparison
    await bcrypt.compare(password ?? "", dummyHash());
    return fail();
  }
  if (row.lockedUntil && new Date(row.lockedUntil) > new Date()) {
    throw new HttpError(423, "Account temporarily locked after repeated failed attempts. Try again later.");
  }
  if (!(await bcrypt.compare(password ?? "", row.passwordHash))) return fail(undefined, row);

  const now = new Date().toISOString();
  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: now }).where(eq(users.id, row.id));
  await db.insert(loginAttempts).values({ ip, email, success: true });
  await appendAudit({ action: "USER_LOGIN", actor: row.id, actorName: row.name, details: `Signed in from ${ip}` });
  return toUser({ ...row, lastLoginAt: now });
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "local").trim();
}

// ---------------------------------------------------------------------------
// API keys (external government systems)
// ---------------------------------------------------------------------------

export const API_SCOPES = ["records:read", "parcels:read", "certificates:read", "export:read"] as const;

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = `dh_${sha256Hex(String(Math.random()) + Date.now()).slice(0, 8)}`;
  const secretPart = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  const key = `${prefix}_${secretPart}`;
  return { key, prefix, hash: sha256Hex(key) };
}

/** Authenticates an `Authorization: Bearer dh_…` request (or a signed-in officer session). */
export async function requireApiAccess(request: Request, scope: (typeof API_SCOPES)[number]): Promise<{ via: "key" | "session"; name: string }> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(dh_[a-f0-9]{8})_[A-Za-z0-9_-]+$/);
  if (match) {
    const db = await getDb();
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.prefix, match[1]), isNull(apiKeys.revokedAt)));
    const presented = Buffer.from(sha256Hex(header.slice(7).trim()));
    if (!key || !timingSafeEqual(presented, Buffer.from(key.keyHash))) throw new HttpError(401, "Invalid API key");
    if (!key.scopes.includes(scope)) throw new HttpError(403, `API key lacks scope ${scope}`);
    await db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, key.id));
    return { via: "key", name: key.name };
  }
  const user = await getSessionUser();
  if (user && user.role !== "CITIZEN") return { via: "session", name: user.name };
  throw new HttpError(401, "Provide an API key: Authorization: Bearer dh_…");
}

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { User, UserRole } from "@/types";
import { JWT_SECRET, JWT_EXPIRY, ROLE_PERMISSIONS } from "./config";
import { roleCanAccess } from "./rbac";

const secret = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "dharohar_session";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function getSessionPayload(): Promise<JWTPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifyToken(token);
}

export function hasPermission(role: UserRole, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(resource);
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  return roleCanAccess(role, pathname);
}

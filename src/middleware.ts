import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { roleCanAccess } from "@/lib/rbac";
import { getHomePathForRole } from "@/lib/dashboard-routes";
import type { UserRole } from "@/types";

/**
 * Edge gate for pages and APIs. Route handlers re-check the session against the database
 * (deactivated users, fine-grained permissions); this layer gives fast redirects and blocks
 * obviously unauthorized traffic.
 */

const COOKIE_NAME = "dharohar_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dharohar-dev-secret-change-in-production");

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/verify",
  "/walkthrough",
  "/api/auth/login",
  "/api/auth/register",
  "/api/public",
  "/api/v1",
  "/api/health",
];

/** Superseded prototype routes (scripted demos and the old JSON-store team stubs). */
const RETIRED_PREFIXES = ["/demo", "/api/local", "/api/integrations/webhooks"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function roleFromToken(token: string | undefined): Promise<UserRole | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as UserRole) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (matches(pathname, RETIRED_PREFIXES)) {
    return isApi
      ? NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
      : NextResponse.redirect(new URL("/", request.url));
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const role = await roleFromToken(token);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(role ? getHomePathForRole(role) : "/login", request.url));
  }

  if (matches(pathname, PUBLIC_PREFIXES)) {
    if (role && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL(getHomePathForRole(role), request.url));
    }
    return NextResponse.next();
  }

  if (!role) {
    if (isApi) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const url = new URL("/login", request.url);
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url));
  }

  if (!roleCanAccess(role, pathname)) {
    if (isApi) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)"],
};

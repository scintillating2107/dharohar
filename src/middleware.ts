import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/config";
import { roleCanAccess } from "@/lib/rbac";
import { getHomePathForRole, isCitizenRole } from "@/lib/citizen";
import type { UserRole } from "@/types";

const secret = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "dharohar_session";
const LOCAL_SERVICE_KEY = process.env.INTEGRATION_SERVICE_KEY || "dharohar-local-dev-key";

const publicPaths = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/local/") || pathname.startsWith("/api/integrations/webhooks")) {
    const key = request.headers.get("x-integration-key");
    if (key === LOCAL_SERVICE_KEY) {
      return NextResponse.next();
    }
    return NextResponse.json({ success: false, error: "Invalid integration key" }, { status: 401 });
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/samples") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico)$/)
  ) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (!token) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    try {
      const { payload } = await jwtVerify(token, secret);
      url.pathname = getHomePathForRole(payload.role as string);
    } catch {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  if (isPublic) {
    if (token && pathname === "/login") {
      const url = request.nextUrl.clone();
      try {
        const { payload } = await jwtVerify(token, secret);
        url.pathname = getHomePathForRole(payload.role as string);
      } catch {
        url.pathname = "/dashboard";
      }
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as UserRole;

    if (isCitizenRole(role) && pathname === "/dashboard") {
      const url = request.nextUrl.clone();
      url.pathname = "/citizen/dashboard";
      return NextResponse.redirect(url);
    }
    if (!isCitizenRole(role) && pathname.startsWith("/citizen")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (!roleCanAccess(role, pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = getHomePathForRole(role);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

import type { UserRole } from "@/types";
import { hasPermission, type Permission } from "./config";

/** Page URL prefixes → required permission (longest prefix wins). */
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  "/citizen": "citizen",
  "/dashboard": "dashboard",
  "/documents/upload": "upload",
  "/documents": "documents",
  "/verification": "verification",
  "/records": "records",
  "/validation": "validation",
  "/compare": "validation",
  "/gis": "gis",
  "/audit": "audit",
  "/trust": "audit",
  "/users": "users",
  "/admin": "settings_admin",
  "/integrations": "integrations",
  "/analytics": "analytics",
  "/claims": "claims",
  "/profile": "profile",
  "/settings": "profile",
  "/about": "profile",
  "/showcase": "documents",
};

/** API prefixes → required permission. Route handlers re-check with requireUser(). */
export const API_PERMISSION_MAP: Record<string, Permission> = {
  "/api/documents": "documents",
  "/api/verification": "verification",
  "/api/records": "records",
  "/api/validation": "validation",
  "/api/gis": "gis",
  "/api/audit": "audit",
  "/api/users": "users",
  "/api/dashboard": "dashboard",
  "/api/analytics": "analytics",
  "/api/citizen": "citizen",
  "/api/claims": "profile",
  "/api/admin": "settings_admin",
  "/api/integrations": "integrations",
  "/api/notifications": "profile",
  "/api/meta": "profile",
  "/api/learning": "analytics",
};

export function getRequiredPermission(pathname: string): Permission | null {
  const map = pathname.startsWith("/api/") ? API_PERMISSION_MAP : ROUTE_PERMISSION_MAP;
  const prefix = Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return prefix ? map[prefix] : null;
}

export function roleCanAccess(role: UserRole, pathname: string): boolean {
  const permission = getRequiredPermission(pathname);
  if (!permission) return true;
  return hasPermission(role, permission);
}

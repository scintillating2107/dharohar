import type { UserRole } from "@/types";
import { ROLE_PERMISSIONS } from "./config";

/** Maps URL prefixes to required permission keys */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/citizen": "citizen",
  "/dashboard": "dashboard",
  "/documents": "documents",
  "/verification": "verification",
  "/records": "records",
  "/validation": "validation",
  "/gis": "gis",
  "/audit": "audit",
  "/users": "users",
  "/profile": "profile",
};

export const API_PERMISSION_MAP: Record<string, string> = {
  "/api/documents": "documents",
  "/api/verification": "verification",
  "/api/records": "records",
  "/api/validation": "validation",
  "/api/gis": "gis",
  "/api/audit": "audit",
  "/api/users": "users",
  "/api/dashboard": "dashboard",
  "/api/citizen": "citizen",
  "/api/notifications": "dashboard",
  "/api/integrations": "dashboard",
};

export function getRequiredPermission(pathname: string): string | null {
  const maps = pathname.startsWith("/api/") ? API_PERMISSION_MAP : ROUTE_PERMISSION_MAP;
  const sorted = Object.keys(maps).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname.startsWith(route)) return maps[route];
  }
  return null;
}

export function roleCanAccess(role: UserRole, pathname: string): boolean {
  const permission = getRequiredPermission(pathname);
  if (!permission) return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertRoleAccess(role: UserRole, pathname: string): boolean {
  return roleCanAccess(role, pathname);
}

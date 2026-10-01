import type { UserRole } from "@/types";
import { isCitizenRole } from "@/lib/citizen";

export type OfficerDashboardVariant = "admin" | "operations" | "verification" | "survey";

export const DASHBOARD_META: Record<
  OfficerDashboardVariant,
  { title: string; subtitle: string; path: string }
> = {
  admin: {
    title: "System Command Center",
    subtitle: "Cross-module health, throughput, and governance oversight",
    path: "/dashboard/admin",
  },
  operations: {
    title: "Operations Dashboard",
    subtitle: "Document intake, digitization pipeline, and processing status",
    path: "/dashboard/operations",
  },
  verification: {
    title: "Verification Dashboard",
    subtitle: "Human review queue, confidence signals, and validation outcomes",
    path: "/dashboard/verification",
  },
  survey: {
    title: "Survey & GIS Dashboard",
    subtitle: "Parcels, spatial coverage, and verified land inventory",
    path: "/dashboard/survey",
  },
};

export function getDashboardPathForRole(role: UserRole): string {
  if (isCitizenRole(role)) return "/citizen/dashboard";
  return "/dashboard/overview";
}

export function getHomePathForRole(role: string): string {
  return getDashboardPathForRole(role as UserRole);
}

export function dashboardVariantForRole(role: UserRole): OfficerDashboardVariant {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "DATA_OFFICER":
      return "operations";
    case "VERIFICATION_OFFICER":
      return "verification";
    case "SURVEY_OFFICER":
      return "survey";
    default:
      return "operations";
  }
}

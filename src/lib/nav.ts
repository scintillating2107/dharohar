import type { LucideIcon } from "lucide-react";
import {
  Presentation,
  LayoutDashboard,
  FileText,
  Upload,
  CheckSquare,
  ShieldCheck,
  Map,
  BadgeCheck,
  ClipboardList,
  Settings,
  Home,
  Users,
  User,
  BarChart3,
  Plug,
  UserCheck,
  SlidersHorizontal,
  Library,
  Info,
} from "lucide-react";
import type { Permission } from "@/lib/config";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

/** Sidebar, grouped by purpose. Items a role cannot use are hidden; empty groups are dropped. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [
      { href: "/dashboard/overview", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
      { href: "/citizen/dashboard", label: "Citizen portal", icon: Home, permission: "citizen" },
    ],
  },
  {
    title: "Work",
    items: [
      { href: "/documents/upload", label: "Upload", icon: Upload, permission: "upload" },
      { href: "/documents", label: "Documents", icon: FileText, permission: "documents" },
      { href: "/verification", label: "Verification", icon: CheckSquare, permission: "verification" },
      { href: "/claims", label: "Ownership claims", icon: UserCheck, permission: "claims" },
    ],
  },
  {
    title: "Records",
    items: [
      { href: "/records", label: "Land records", icon: Library, permission: "records" },
      { href: "/validation", label: "Validation", icon: ShieldCheck, permission: "validation" },
      { href: "/gis", label: "Map", icon: Map, permission: "gis" },
      { href: "/trust", label: "Certificates", icon: BadgeCheck, permission: "audit" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics" },
      { href: "/audit", label: "Audit log", icon: ClipboardList, permission: "audit" },
      { href: "/showcase", label: "Workflow demo", icon: Presentation, permission: "documents" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Users", icon: Users, permission: "users" },
      { href: "/admin", label: "System settings", icon: SlidersHorizontal, permission: "settings_admin" },
      { href: "/integrations", label: "Integrations", icon: Plug, permission: "integrations" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/settings", label: "My settings", icon: Settings, permission: "profile" },
      { href: "/profile", label: "Profile", icon: User, permission: "profile" },
      { href: "/about", label: "About", icon: Info, permission: "profile" },
    ],
  },
];

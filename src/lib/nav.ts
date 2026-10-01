import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Upload,
  CheckSquare,
  ShieldCheck,
  Map,
  Link2,
  Clapperboard,
  ClipboardList,
  Settings,
  Home,
  Users,
  User,
} from "lucide-react";
import { DEMO_RECORD_ID } from "@/lib/record-ids";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  /** Highlight for judges / demo walkthrough */
  highlight?: boolean;
}

/** Single flat menu — no nested sections. */
export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard/overview", label: "Home", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/demo", label: "Demo hub", icon: Clapperboard, permission: "dashboard", highlight: true },
  { href: "/demo/workflow", label: "Digitization demo", icon: Clapperboard, permission: "dashboard" },
  { href: "/demo/portal", label: "GIS & ledger demo", icon: Map, permission: "dashboard" },
  { href: "/documents/upload", label: "Upload", icon: Upload, permission: "documents" },
  { href: "/documents", label: "Documents", icon: FileText, permission: "documents" },
  { href: "/records", label: "Land records", icon: FileText, permission: "records" },
  { href: `/records/${DEMO_RECORD_ID}`, label: "Sample record", icon: FileText, permission: "records" },
  { href: "/verification", label: "Verification", icon: CheckSquare, permission: "verification" },
  { href: "/validation", label: "Validation", icon: ShieldCheck, permission: "validation" },
  { href: "/gis", label: "Map", icon: Map, permission: "gis" },
  { href: "/trust", label: "Certification", icon: Link2, permission: "audit" },
  { href: "/audit", label: "Audit log", icon: ClipboardList, permission: "audit" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "profile" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/citizen/dashboard", label: "Citizen portal", icon: Home, permission: "citizen" },
  { href: "/users", label: "Users", icon: Users, permission: "users" },
  { href: "/profile", label: "Profile", icon: User, permission: "profile" },
];

/** @deprecated Use MAIN_NAV — kept so older imports do not break. */
export const NAV_SECTIONS = [{ title: "Menu", items: MAIN_NAV }];

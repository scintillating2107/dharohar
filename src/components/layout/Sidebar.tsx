"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Database,
  ShieldCheck,
  Map,
  ClipboardList,
  Users,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { useState } from "react";
import { cn, formatRole } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_PERMISSIONS } from "@/lib/config";
import { GovEmblem } from "./GovBranding";

const NAV_ITEMS = [
  { href: "/citizen/dashboard", label: "Citizen Portal", icon: Home, permission: "citizen" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/documents", label: "Documents", icon: FileText, permission: "documents" },
  { href: "/verification", label: "Verification", icon: CheckSquare, permission: "verification" },
  { href: "/records", label: "Land Records", icon: Database, permission: "records" },
  { href: "/validation", label: "Validation", icon: ShieldCheck, permission: "validation" },
  { href: "/gis", label: "GIS Map", icon: Map, permission: "gis" },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList, permission: "audit" },
  { href: "/users", label: "User Management", icon: Users, permission: "users" },
  { href: "/profile", label: "My Profile", icon: User, permission: "profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && ROLE_PERMISSIONS[user.role]?.includes(item.permission)
  );

  const nav = (
    <nav className="flex flex-col h-full bg-[var(--gov-navy)]">
      {/* Sidebar brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <GovEmblem className="h-9 w-9 text-white/80 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-white leading-tight">Dharohar</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">
              LRMS Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-3 px-2 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
          Main Menu
        </p>
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-white/15 text-white shadow-sm border-l-[3px] border-[var(--gov-saffron)] pl-[calc(0.75rem-3px)]"
                    : "text-white/65 hover:bg-white/8 hover:text-white border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]"
                )}
              >
                <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[var(--gov-saffron)]" : "text-white/50 group-hover:text-white/80")} />
                {item.label}
                {active && <ChevronRight className="h-3 w-3 ml-auto text-white/40" />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User panel */}
      {user && (
        <div className="border-t border-white/10 p-4 bg-black/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[var(--gov-navy-light)] border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-[11px] text-white/50">{formatRole(user.role)}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs text-white/55 hover:text-white hover:bg-white/8 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      <button
        className="fixed top-[4.5rem] left-4 z-50 rounded gov-card p-2 lg:hidden shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5 text-[var(--gov-navy)]" /> : <Menu className="h-5 w-5 text-[var(--gov-navy)]" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[var(--sidebar-width)] transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto shadow-xl lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {nav}
      </aside>
    </>
  );
}

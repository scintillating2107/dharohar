"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, Play } from "lucide-react";
import { useState, useMemo } from "react";
import { cn, formatRole } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_PERMISSIONS } from "@/lib/config";
import { MAIN_NAV, SECONDARY_NAV } from "@/lib/nav";
import type { UserRole } from "@/types";

function isNavActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/dashboard/overview") {
    return pathname === path || pathname === "/dashboard";
  }
  if (path.startsWith("/citizen")) {
    return pathname.startsWith("/citizen");
  }
  if (path === "/demo") return pathname === "/demo";
  if (path === "/demo/workflow") return pathname.startsWith("/demo/workflow");
  if (path === "/demo/portal") return pathname.startsWith("/demo/portal");
  if (path === "/documents") {
    return pathname === "/documents" || (pathname.startsWith("/documents/") && !pathname.startsWith("/documents/upload"));
  }
  if (path === "/documents/upload") {
    return pathname === "/documents/upload";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainItems = useMemo(() => {
    if (!user) return [];
    const perms = ROLE_PERMISSIONS[user.role] ?? [];
    return MAIN_NAV.filter((item) => {
      if (perms.includes(item.permission)) return true;
      if (item.href === "/demo/workflow" && perms.includes("citizen")) return true;
      return false;
    });
  }, [user]);

  const secondaryItems = useMemo(() => {
    if (!user) return [];
    return SECONDARY_NAV.filter((item) => ROLE_PERMISSIONS[user.role]?.includes(item.permission));
  }, [user]);

  const navLink = (item: (typeof MAIN_NAV)[0], compact?: boolean) => {
    const active = isNavActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
          item.highlight && !active && "ring-1 ring-[var(--gov-saffron)]/40 bg-[var(--gov-saffron)]/10",
          active
            ? "bg-white/15 text-white border-l-[3px] border-[var(--gov-saffron)] pl-[calc(0.75rem-3px)]"
            : "text-white/65 hover:bg-white/8 hover:text-white border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]"
        )}
      >
        <item.icon
          className={cn(
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
            "flex-shrink-0",
            active || item.highlight ? "text-[var(--gov-saffron)]" : "text-white/45"
          )}
        />
        <span className="truncate">{item.label}</span>
        {item.highlight && <Play className="h-3 w-3 ml-auto opacity-70" />}
      </Link>
    );
  };

  const nav = (
    <nav className="flex flex-col h-full bg-[var(--gov-navy)]">
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-sm font-bold text-white tracking-tight">Dharohar</p>
        <p className="text-[11px] text-white/45 mt-0.5">Land record digitization</p>
      </div>

      <div className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {mainItems.map((item) => navLink(item))}

        {secondaryItems.length > 0 && (
          <>
            <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">Account</p>
            {secondaryItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium",
                    active ? "bg-white/12 text-white" : "text-white/50 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {user && (
        <div className="border-t border-white/10 p-4 bg-black/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[var(--gov-navy-light)] border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-[11px] text-white/50">{formatRole(user.role as UserRole)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs text-white/55 hover:text-white hover:bg-white/8"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed top-[4.5rem] left-4 z-50 rounded gov-card p-2 lg:hidden shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5 text-[var(--gov-navy)]" /> : <Menu className="h-5 w-5 text-[var(--gov-navy)]" />}
      </button>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[var(--sidebar-width)] transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto shadow-xl lg:shadow-none pt-14 lg:pt-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {nav}
      </aside>
    </>
  );
}

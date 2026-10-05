"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn, formatRole } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { hasPermission } from "@/lib/config";
import { NAV_GROUPS } from "@/lib/nav";

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard/overview") return pathname.startsWith("/dashboard");
  if (href === "/documents") {
    return pathname === "/documents" || (pathname.startsWith("/documents/") && !pathname.startsWith("/documents/upload"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLocale();

  const groups = useMemo(
    () =>
      user
        ? NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasPermission(user.role, i.permission)) })).filter((g) => g.items.length)
        : [],
    [user]
  );

  // Close the mobile drawer after navigating
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const nav = (
    <nav className="flex flex-col h-full bg-[var(--gov-navy)]" aria-label={t("Main navigation")}>
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white tracking-tight">{t("Dharohar")}</p>
          <p className="text-[11px] text-white/45 mt-0.5">{t("Land record digitization")}</p>
        </div>
        <button type="button" onClick={onClose} className="lg:hidden text-white/70 hover:text-white p-1" aria-label={t("Close menu")}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 py-3 px-2 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className={gi > 0 ? "mt-4" : undefined}>
            {group.title && <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">{t(group.title)}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-l-[3px] pl-[calc(0.75rem-3px)]",
                      active ? "bg-white/15 text-white border-[var(--gov-saffron)]" : "text-white/70 hover:bg-white/10 hover:text-white border-transparent"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[var(--gov-saffron)]" : "text-white/45")} />
                    <span className="truncate">{t(item.label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {user && (
        <div className="border-t border-white/10 p-4 bg-black/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[var(--gov-navy-light)] border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-[11px] text-white/50">{t(formatRole(user.role))}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("Sign out")}
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] transform transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-[60px] lg:z-auto lg:h-[calc(100vh-60px)] shadow-xl lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {nav}
      </aside>
    </>
  );
}

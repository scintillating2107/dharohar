"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { GovEmblem, GovTricolor, LanguageToggle } from "./GovBranding";
import { PS_DEPARTMENT, PS_ORGANIZATION } from "@/lib/problem-statement";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDate, formatRole } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { hasPermission } from "@/lib/config";
import type { AppNotification } from "@/types";

interface NotificationData {
  items: AppNotification[];
  unread: number;
  counts: { pendingVerification: number; processingDocuments: number; failedDocuments: number; pendingClaims: number };
}


export function AppShellTopbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { t, tx } = useLocale();
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [query, setQuery] = useState("");
  const { data, reload } = useApi<NotificationData>(user ? "/api/notifications" : null, { pollMs: 30000 });

  const counts = data?.counts;
  const can = (p: Parameters<typeof hasPermission>[1]) => (user ? hasPermission(user.role, p) : false);
  const workItems = [
    can("verification") && counts?.pendingVerification
      ? { href: "/verification", label: t("{n} record(s) awaiting verification", { n: counts.pendingVerification }) }
      : null,
    counts?.failedDocuments ? { href: "/documents?status=FAILED", label: t("{n} document(s) failed processing", { n: counts.failedDocuments }) } : null,
    counts?.processingDocuments ? { href: "/documents", label: t("{n} document(s) processing", { n: counts.processingDocuments }) } : null,
    can("claims") && counts?.pendingClaims ? { href: "/claims", label: t("{n} ownership claim(s) to review", { n: counts.pendingClaims }) } : null,
  ].filter(Boolean) as { href: string; label: string }[];
  const badge = (data?.unread ?? 0) + workItems.length;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/records?search=${encodeURIComponent(q)}` : "/records");
  };

  const openNotifications = async () => {
    const next = !showNotif;
    setShowNotif(next);
    if (next && data?.unread) {
      await apiPost("/api/notifications/read").catch(() => undefined);
      reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--gov-navy)] text-white shadow-md">
      <GovTricolor />
      <div className="flex h-14 items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
        <button type="button" onClick={onMenu} className="lg:hidden p-2 -ml-1 rounded-md hover:bg-white/10" aria-label={t("Open menu")}>
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <GovEmblem className="h-8 w-8 text-white/85" />
          <div className="hidden sm:block min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/55 truncate">{t(PS_ORGANIZATION)}</p>
            <p className="text-sm font-bold tracking-tight truncate leading-tight">
              {t("Dharohar")} · {t(PS_DEPARTMENT)}
            </p>
          </div>
          <span className="sm:hidden font-bold">{t("Dharohar")}</span>
        </Link>

        {user && hasPermission(user.role, "records") && (
          <form onSubmit={onSearch} className="flex-1 max-w-xl hidden md:flex" role="search">
            <label className="relative w-full">
              <span className="sr-only">{t("Search records")}</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search record ID, khasra, owner, village...")}
                className="w-full rounded-md bg-white/10 border border-white/15 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[var(--gov-saffron)]/50"
              />
            </label>
          </form>
        )}

        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {user && hasPermission(user.role, "records") && (
            <Link href="/records" className="md:hidden p-2 rounded-md hover:bg-white/10" aria-label={t("Search records")}>
              <Search className="h-5 w-5" />
            </Link>
          )}
          <LanguageToggle />

          <div className="relative">
            <button
              type="button"
              className="relative p-2 rounded-md text-white/80 hover:bg-white/10"
              onClick={openNotifications}
              aria-label={badge ? t("Notifications ({n})", { n: badge }) : t("Notifications")}
              aria-expanded={showNotif}
            >
              <Bell className="h-5 w-5" />
              {badge > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 rounded-full bg-[var(--gov-saffron)] text-[10px] font-bold flex items-center justify-center text-[var(--gov-navy)]">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 z-50 sm:w-96 gov-card shadow-xl text-[var(--gov-navy)]">
                  <div className="gov-card-header text-sm font-semibold">{t("Notifications")}</div>
                  <div className="p-2 max-h-96 overflow-y-auto text-sm">
                    {workItems.length > 0 && (
                      <div className="mb-2 border-b border-[var(--gov-border-light)] pb-2">
                        <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--gov-text-muted)] font-semibold">{t("Work queues")}</p>
                        {workItems.map((w) => (
                          <Link key={w.href + w.label} href={w.href} className="block px-3 py-2 rounded hover:bg-[var(--gov-bg)]" onClick={() => setShowNotif(false)}>
                            {w.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {data?.items.length
                      ? data.items.map((n) => (
                          <Link key={n.id} href={n.link || "#"} onClick={() => setShowNotif(false)} className="block px-3 py-2 rounded hover:bg-[var(--gov-bg)]">
                            <p className={n.readAt ? "text-[var(--gov-text-muted)]" : "font-semibold"}>{tx(n.title)}</p>
                            {n.body && <p className="text-xs text-[var(--gov-text-muted)] truncate">{tx(n.body)}</p>}
                            <p className="text-[10px] text-[var(--gov-text-light)] mt-0.5">{formatDate(n.createdAt)}</p>
                          </Link>
                        ))
                      : workItems.length === 0 && <p className="px-3 py-6 text-center text-[var(--gov-text-muted)]">{t("You're all caught up.")}</p>}
                  </div>
                </div>
              </>
            )}
          </div>

          {user && (
            <div className="relative sm:pl-2 sm:border-l border-white/15">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10"
                onClick={() => setShowUser(!showUser)}
                aria-expanded={showUser}
                aria-label={t("Account menu")}
              >
                <span className="h-7 w-7 rounded-full bg-[var(--gov-navy-light)] border border-white/20 flex items-center justify-center text-xs font-bold sm:hidden">
                  {user.name.charAt(0)}
                </span>
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-white/50 hidden xl:inline">{t(formatRole(user.role))}</span>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </button>
              {showUser && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 gov-card shadow-xl py-1 text-sm text-[var(--gov-navy)]">
                    <div className="px-4 py-2 border-b border-[var(--gov-border-light)]">
                      <p className="font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-[var(--gov-text-muted)]">{t(formatRole(user.role))}</p>
                    </div>
                    <Link href="/profile" className="block px-4 py-2 hover:bg-[var(--gov-bg)]" onClick={() => setShowUser(false)}>
                      {t("Profile")}
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 hover:bg-[var(--gov-bg)]" onClick={() => setShowUser(false)}>
                      {t("My settings")}
                    </Link>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-[var(--gov-bg)] text-red-600"
                      onClick={() => {
                        setShowUser(false);
                        logout();
                      }}
                    >
                      {t("Sign out")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

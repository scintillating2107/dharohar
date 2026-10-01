"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, HelpCircle, Search, Activity } from "lucide-react";
import { GovEmblem, GovTricolor } from "./GovBranding";
import { PS_DEPARTMENT, PS_ORGANIZATION } from "@/lib/problem-statement";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { formatRole } from "@/lib/utils";
import { apiGet } from "@/lib/api-client";
import { ROLE_PERMISSIONS } from "@/lib/config";

interface NotificationCounts {
  pendingVerification: number;
  processingDocuments: number;
  validationIssues: number;
  total: number;
}

export function AppShellTopbar() {
  const { user, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    apiGet<NotificationCounts>("/api/notifications").then(setCounts).catch(() => setCounts(null));
  }, [user]);

  const canVerify = user && ROLE_PERMISSIONS[user.role]?.includes("verification");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/records?search=${encodeURIComponent(q)}`);
    else router.push("/records");
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--gov-navy)] text-white border-b border-white/10 shadow-md">
      <GovTricolor />
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <GovEmblem className="h-8 w-8 text-white/85" />
          <div className="hidden sm:block min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/55 truncate">{PS_ORGANIZATION}</p>
            <p className="text-sm font-bold tracking-tight truncate leading-tight">Dharohar · {PS_DEPARTMENT}</p>
          </div>
        </div>

        <form onSubmit={onSearch} className="flex-1 max-w-xl hidden md:flex">
          <label className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === "hi" ? "रिकॉर्ड खोजें..." : "Search records..."}
              className="w-full rounded-md bg-white/10 border border-white/15 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[var(--gov-saffron)]/50"
            />
          </label>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden lg:flex items-center gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLocale("hi")}
              className={locale === "hi" ? "text-[var(--gov-saffron)]" : "text-white/55 hover:text-white"}
            >
              हिन्दी
            </button>
            <span className="text-white/30">|</span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={locale === "en" ? "text-[var(--gov-saffron)]" : "text-white/55 hover:text-white"}
            >
              English
            </button>
          </div>

          <span className="hidden xl:flex items-center gap-1.5 text-xs text-white/70 px-2">
            <Activity className="h-3.5 w-3.5 text-[var(--gov-green)]" />
            {locale === "hi" ? "सिस्टम सक्रिय" : "System operational"}
          </span>

          <Link
            href="/demo/workflow"
            className="hidden sm:flex items-center gap-1.5 rounded-md bg-[var(--gov-saffron)] text-[var(--gov-navy)] px-3 py-1.5 text-xs font-bold hover:brightness-105"
          >
            <HelpCircle className="h-4 w-4" />
            Demo
          </Link>

          <div className="relative">
            <button
              type="button"
              className="relative p-2 rounded-md text-white/80 hover:bg-white/10"
              onClick={() => setShowNotif(!showNotif)}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {counts && counts.total > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 rounded-full bg-[var(--gov-saffron)] text-[10px] font-bold flex items-center justify-center">
                  {counts.total > 9 ? "9+" : counts.total}
                </span>
              )}
            </button>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 gov-card shadow-xl text-[var(--gov-navy)]">
                  <div className="gov-card-header text-sm font-semibold">Notifications</div>
                  <div className="p-2 space-y-1 max-h-72 overflow-y-auto text-sm">
                    {canVerify && counts && counts.pendingVerification > 0 && (
                      <Link href="/verification" className="block px-3 py-2 rounded hover:bg-[var(--gov-bg)]" onClick={() => setShowNotif(false)}>
                        {counts.pendingVerification} pending verification
                      </Link>
                    )}
                    {counts && counts.validationIssues > 0 && (
                      <Link href="/validation" className="block px-3 py-2 rounded hover:bg-[var(--gov-bg)]" onClick={() => setShowNotif(false)}>
                        {counts.validationIssues} validation issues
                      </Link>
                    )}
                    {(!counts || counts.total === 0) && (
                      <p className="px-3 py-4 text-center text-[var(--gov-text-muted)]">No new notifications</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {user && (
            <div className="relative pl-2 border-l border-white/15">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10"
                onClick={() => setShowUser(!showUser)}
              >
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-white/50 hidden md:inline">
                  {formatRole(user.role)}
                </span>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </button>
              {showUser && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-48 gov-card shadow-xl py-1 text-sm text-[var(--gov-navy)]">
                    <Link href="/profile" className="block px-4 py-2 hover:bg-[var(--gov-bg)]" onClick={() => setShowUser(false)}>
                      Profile
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 hover:bg-[var(--gov-bg)]" onClick={() => setShowUser(false)}>
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-[var(--gov-bg)] text-red-600"
                      onClick={() => { setShowUser(false); logout(); }}
                    >
                      Sign out
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { formatRole } from "@/lib/utils";
import { apiGet } from "@/lib/api-client";
import { ROLE_PERMISSIONS } from "@/lib/config";

interface NotificationCounts {
  pendingVerification: number;
  processingDocuments: number;
  validationIssues: number;
  total: number;
}

export function Topbar({ title }: { title: string }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiGet<NotificationCounts>("/api/notifications")
      .then(setCounts)
      .catch(() => setCounts(null));
    const interval = setInterval(() => {
      apiGet<NotificationCounts>("/api/notifications")
        .then(setCounts)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const canVerify = user && ROLE_PERMISSIONS[user.role]?.includes("verification");

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[var(--gov-border-light)] shadow-sm">
      <div className="flex h-14 items-center justify-between px-6 lg:px-8">
        <div className="pl-10 lg:pl-0 min-w-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[var(--gov-text-muted)] mb-0.5">
            <Home className="h-3 w-3" />
            <ChevronRight className="h-3 w-3" />
            <span className="text-[var(--gov-navy-light)] font-medium">{title}</span>
          </nav>
          <h2 className="text-base font-semibold text-[var(--gov-navy)] truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              className="relative rounded-full p-2 text-[var(--gov-text-muted)] hover:bg-[var(--gov-bg)] hover:text-[var(--gov-navy)] transition-colors"
              aria-label="Notifications"
              onClick={() => setShowMenu(!showMenu)}
            >
              <Bell className="h-5 w-5" />
              {counts && counts.total > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gov-saffron)] text-[10px] font-bold text-white">
                  {counts.total > 9 ? "9+" : counts.total}
                </span>
              )}
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-80 gov-card shadow-lg overflow-hidden">
                  <div className="gov-card-header">
                    <p className="text-sm font-semibold text-[var(--gov-navy)]">Notifications</p>
                  </div>
                  <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
                    {canVerify && counts && counts.pendingVerification > 0 && (
                      <Link href="/verification" onClick={() => setShowMenu(false)}
                        className="flex items-start gap-3 rounded px-3 py-2.5 hover:bg-[var(--gov-bg)] transition-colors">
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-[var(--gov-saffron)] flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-[var(--gov-navy)]">{counts.pendingVerification} pending verification</span>
                          <span className="block text-xs text-[var(--gov-text-muted)]">Records awaiting officer review</span>
                        </div>
                      </Link>
                    )}
                    {counts && counts.processingDocuments > 0 && (
                      <Link href="/documents" onClick={() => setShowMenu(false)}
                        className="flex items-start gap-3 rounded px-3 py-2.5 hover:bg-[var(--gov-bg)] transition-colors">
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-[var(--gov-navy-light)] flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-[var(--gov-navy)]">{counts.processingDocuments} documents processing</span>
                          <span className="block text-xs text-[var(--gov-text-muted)]">Digitization pipeline in progress</span>
                        </div>
                      </Link>
                    )}
                    {counts && counts.validationIssues > 0 && (
                      <Link href="/validation" onClick={() => setShowMenu(false)}
                        className="flex items-start gap-3 rounded px-3 py-2.5 hover:bg-[var(--gov-bg)] transition-colors">
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-[var(--gov-navy)]">{counts.validationIssues} validation issues</span>
                          <span className="block text-xs text-[var(--gov-text-muted)]">Review required before approval</span>
                        </div>
                      </Link>
                    )}
                    {(!counts || counts.total === 0) && (
                      <p className="px-3 py-6 text-sm text-[var(--gov-text-muted)] text-center">No new notifications</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-[var(--gov-border-light)]">
              <Badge variant="info">{formatRole(user.role)}</Badge>
              <span className="hidden md:block text-sm text-[var(--gov-text)] font-medium">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

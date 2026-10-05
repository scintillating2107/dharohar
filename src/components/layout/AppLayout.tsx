"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AppShellTopbar } from "./AppShellTopbar";
import { GovFooter } from "./GovBranding";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * Signed-in page shell. `title` names the page for the browser tab and screen readers; each page
 * renders its own visible heading.
 */
export function AppLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { t } = useLocale();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    document.title = `${t(title)} · ${t("Dharohar")}`;
  }, [title, t]);

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:px-3 focus:py-2 focus:rounded">
        {t("Skip to content")}
      </a>
      <AppShellTopbar onMenu={() => setNavOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar open={navOpen} onClose={closeNav} />
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--gov-bg)]">
          <main id="main" className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="max-w-[1400px] mx-auto">{children}</div>
          </main>
          <GovFooter />
        </div>
      </div>
    </div>
  );
}

/** Standard page heading: title, optional description and actions. */
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--gov-navy)]">{t(title)}</h1>
        {description && <p className="text-sm text-[var(--gov-text-muted)] mt-1 max-w-3xl">{t(description)}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

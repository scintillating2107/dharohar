"use client";

import Link from "next/link";
import { GovHeader, GovFooter, GovTricolor } from "./GovBranding";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";

/** Full-page message used for 404 and unexpected errors outside the app shell. */
export function StatusPage({
  code,
  title,
  description,
  onRetry,
}: {
  code: string;
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
      <GovHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="gov-card overflow-hidden w-full max-w-lg text-center">
          <GovTricolor />
          <div className="p-8">
            <p className="text-5xl font-bold text-[var(--gov-navy)]/20">{code}</p>
            <h1 className="mt-2 text-xl font-bold text-[var(--gov-navy)]">{t(title)}</h1>
            <p className="mt-2 text-sm text-[var(--gov-text-muted)]">{t(description)}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {onRetry && <Button onClick={onRetry}>{t("Try again")}</Button>}
              <Link href="/dashboard">
                <Button variant={onRetry ? "outline" : "primary"}>{t("Go to dashboard")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <GovFooter />
    </div>
  );
}

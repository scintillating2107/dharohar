"use client";

import Link from "next/link";
import { GovFooter, GovHeader } from "@/components/layout/GovBranding";
import { Button } from "@/components/ui/Button";

export function PublicShell({
  title,
  subtitle,
  children,
  hideQuickLinks,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  hideQuickLinks?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--gov-bg)]">
      <GovHeader />
      <div className="border-b border-[var(--gov-border-light)] bg-white">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--gov-navy)]">{title}</h1>
            {subtitle && <p className="text-sm text-[var(--gov-text-muted)] mt-1 max-w-2xl">{subtitle}</p>}
          </div>
          {!hideQuickLinks && (
            <div className="flex flex-wrap gap-2">
              <Link href="/demo">
                <Button size="sm" variant="outline">Demo hub</Button>
              </Link>
              <Link href="/demo/workflow">
                <Button size="sm" variant="outline">Digitization walkthrough</Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6">{children}</main>
      <GovFooter />
    </div>
  );
}

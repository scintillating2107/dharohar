"use client";

import Link from "next/link";
import { APP_DESCRIPTION } from "@/lib/config";
import { PS_DEPARTMENT, PS_ORGANIZATION } from "@/lib/problem-statement";
import { useLocale } from "@/contexts/LocaleContext";

export function GovEmblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line key={deg} x1="24" y1="8" x2="24" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.6" transform={`rotate(${deg} 24 24)`} />
      ))}
    </svg>
  );
}

export function GovTricolor() {
  return (
    <div className="gov-tricolor" aria-hidden="true">
      <span className="gov-tricolor__band gov-tricolor__saffron" />
      <span className="gov-tricolor__band gov-tricolor__white" />
      <span className="gov-tricolor__band gov-tricolor__green" />
    </div>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`flex items-center rounded-md border border-white/20 overflow-hidden text-xs font-semibold ${className ?? ""}`} role="group" aria-label="Language / भाषा">
      <button
        type="button"
        onClick={() => setLocale("hi")}
        aria-pressed={locale === "hi"}
        className={`px-2 py-1 ${locale === "hi" ? "bg-[var(--gov-saffron)] text-[var(--gov-navy)]" : "text-white/70 hover:text-white"}`}
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`px-2 py-1 ${locale === "en" ? "bg-[var(--gov-saffron)] text-[var(--gov-navy)]" : "text-white/70 hover:text-white"}`}
      >
        EN
      </button>
    </div>
  );
}

export function GovHeader({ compact = false, right }: { compact?: boolean; right?: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <header className="w-full bg-[var(--gov-navy)] text-white">
      <GovTricolor />
      <div className={`max-w-[1400px] mx-auto w-full flex items-center justify-between gap-3 ${compact ? "px-4 py-2" : "px-4 py-3 lg:px-8"}`}>
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <GovEmblem className={compact ? "h-8 w-8 text-white/90" : "h-10 w-10 text-white/90"} />
          <div className="min-w-0">
            <p className="text-white/70 uppercase tracking-wider text-[10px] sm:text-[11px]">{t(PS_ORGANIZATION)}</p>
            <p className="font-bold tracking-tight text-base sm:text-lg leading-tight">
              {t("Dharohar")} <span className="hidden sm:inline font-normal text-white/80 text-sm">· {t(PS_DEPARTMENT)}</span>
            </p>
            {!compact && <p className="text-xs text-white/55 mt-0.5 hidden md:block">{t(APP_DESCRIPTION)}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}

export function GovFooter() {
  const { t } = useLocale();
  const link = "hover:text-[var(--gov-navy)] hover:underline";
  return (
    <footer className="border-t border-[var(--gov-border)] bg-white mt-auto print:hidden">
      <GovTricolor />
      <div className="px-4 sm:px-6 py-4 lg:px-8 text-xs text-[var(--gov-text-muted)]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-[var(--gov-navy)]">{t(PS_ORGANIZATION)}</p>
            <p>{t(PS_DEPARTMENT)}</p>
            <p className="mt-2">© {new Date().getFullYear()} {t("Dharohar")}</p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t("Footer")}>
            <Link href="/about" className={link}>{t("About")}</Link>
            <a href="/api/v1/openapi.json" className={link}>{t("API documentation")}</a>
            <a href="https://dolr.gov.in/" target="_blank" rel="noopener noreferrer" className={link}>{t("DoLR")}</a>
            <a href="https://dilrmp.gov.in/" target="_blank" rel="noopener noreferrer" className={link}>{t("DILRMP")}</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useLocale } from "@/contexts/LocaleContext";

export function LoadingState({ message }: { message?: string }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center py-20" role="status" aria-live="polite">
      <div className="h-10 w-10 rounded-full border-2 border-[var(--gov-border)] border-t-[var(--gov-navy)] animate-spin" />
      <p className="mt-4 text-sm font-medium text-[var(--gov-text-muted)]">{t(message ?? "Loading…")}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gov-card">
      <div className="mb-4 rounded-full bg-[var(--gov-bg)] p-5 border border-[var(--gov-border-light)]">
        <svg className="h-10 w-10 text-[var(--gov-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-[var(--gov-navy)]">{t(title)}</h3>
      {description && <p className="mt-1.5 text-sm text-[var(--gov-text-muted)] max-w-sm">{t(description)}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t, tx } = useLocale();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gov-card border-l-4 border-l-red-500" role="alert">
      <div className="mb-4 rounded-full bg-red-50 p-5 border border-red-100">
        <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-red-700">{tx(message)}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-sm font-semibold text-[var(--gov-navy-light)] hover:text-[var(--gov-navy)] underline underline-offset-2">
          {t("Try again")}
        </button>
      )}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const { t } = useLocale();
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-medium text-[var(--gov-navy)]">{t(label)}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="block text-xs text-[var(--gov-text-muted)] mt-1">{t(hint)}</span>}
    </label>
  );
}

const control =
  "w-full rounded-md border border-[var(--gov-border)] bg-white px-3 py-2.5 text-sm text-[var(--gov-text)] focus:border-[var(--gov-navy-light)] focus:outline-none focus:ring-2 focus:ring-[var(--gov-navy-light)]/20 disabled:bg-[var(--gov-bg-subtle)]";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-[80px]", className)} {...props} />;
}

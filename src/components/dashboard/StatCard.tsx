"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  accent?: "navy" | "green" | "saffron" | "amber" | "blue" | "red";
  href?: string;
}

const accentBorder = {
  navy: "border-l-[var(--gov-navy)]",
  green: "border-l-[var(--gov-green)]",
  saffron: "border-l-[var(--gov-saffron)]",
  amber: "border-l-amber-500",
  blue: "border-l-[var(--gov-navy-light)]",
  red: "border-l-red-600",
};

const iconBg = {
  navy: "bg-[var(--gov-navy)]/8 text-[var(--gov-navy)]",
  green: "bg-green-50 text-[var(--gov-green)]",
  saffron: "bg-orange-50 text-[var(--gov-saffron)]",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-[var(--gov-navy-light)]",
  red: "bg-red-50 text-red-600",
};

/** KPI tile. With `href` the whole tile links to the list behind the number. */
export function StatCard({ title, value, subtitle, icon: Icon, className, accent = "navy", href }: StatCardProps) {
  const { t } = useLocale();
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", iconBg[accent])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <p className="min-w-0 text-[13px] font-medium leading-tight text-[var(--gov-text-muted)]">{t(title)}</p>
      </div>
      <p className="mt-3 text-[28px] font-bold leading-none text-[var(--gov-navy)] tabular-nums">{value}</p>
      {subtitle && <p className="mt-1.5 text-xs text-[var(--gov-text-muted)] line-clamp-2">{t(subtitle)}</p>}
    </>
  );
  const classes = cn("gov-card border-l-4 p-4 block h-full", accentBorder[accent], className);
  return href ? (
    <Link href={href} className={cn(classes, "transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--gov-navy-light)] outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** Horizontal bars that stay readable at any width (replaces small pie / bar charts). */
export function BarList({
  items,
  color = "var(--gov-navy)",
  empty,
  suffix = "",
  max: fixedMax,
}: {
  items: { label: string; value: number; color?: string; href?: string }[];
  color?: string;
  empty: string;
  /** Appended to each value, e.g. "%" */
  suffix?: string;
  /** Scale bars against this instead of the largest value (e.g. 100 for percentages) */
  max?: number;
}) {
  const { t } = useLocale();
  const max = fixedMax ?? Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0 || items.every((i) => i.value === 0)) {
    return <p className="text-sm text-[var(--gov-text-muted)] py-6 text-center">{t(empty)}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const row = (
          <>
            <div className="flex justify-between gap-3 text-sm mb-1">
              <span className="text-[var(--gov-navy)] font-medium truncate">{t(item.label)}</span>
              <span className="tabular-nums text-[var(--gov-text-muted)] shrink-0">{item.value}{suffix}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--gov-border-light)]">
              <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? color }} />
            </div>
          </>
        );
        return (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className="block rounded hover:bg-[var(--gov-bg-subtle)] -mx-1 px-1">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}

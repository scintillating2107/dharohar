"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ children, className, title, action, noPadding }: CardProps) {
  const { t } = useLocale();
  return (
    <div className={cn("gov-card overflow-hidden", className)}>
      {(title || action) && (
        <div className="gov-card-header flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h3 className="text-sm font-semibold text-[var(--gov-navy)] flex items-center gap-2">
              <span className="inline-block w-1 h-4 bg-[var(--gov-saffron)] rounded-full" />
              {t(title)}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className={noPadding ? undefined : "p-4 sm:p-5"}>{children}</div>
    </div>
  );
}

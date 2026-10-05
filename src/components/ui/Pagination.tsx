"use client";

import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  const { t } = useLocale();
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gov-border-light)] pt-4 mt-4" aria-label={t("Pagination")}>
      <p className="text-sm text-[var(--gov-text-muted)]">{t("Showing {start}–{end} of {total}", { start, end, total })}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("Previous")}</span>
        </Button>
        <span className="text-sm text-[var(--gov-text-muted)]">{t("Page {page} of {pages}", { page, pages: totalPages })}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <span className="hidden sm:inline">{t("Next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

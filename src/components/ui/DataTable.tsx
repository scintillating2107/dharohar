"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useLocale } from "@/contexts/LocaleContext";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  keyField: keyof T;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = "No data found",
  emptyDescription,
  onRowClick,
  keyField,
}: DataTableProps<T>) {
  const { t } = useLocale();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return data;
    return [...data].sort((a, b) => {
      const av = column.sortValue
        ? column.sortValue(a)
        : String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = column.sortValue
        ? column.sortValue(b)
        : String((b as Record<string, unknown>)[sortKey] ?? "");
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [columns, data, sortDir, sortKey]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) return <LoadingState />;
  if (data.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="gov-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="gov-table w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn("text-left", col.className)}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-[var(--gov-navy)]"
                      onClick={() => toggleSort(col.key)}
                    >
                      {t(col.header)}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    t(col.header)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gov-border-light)] bg-white">
            {sortedData.map((item) => (
              <tr
                key={String(item[keyField])}
                onClick={() => onRowClick?.(item)}
                className={cn("transition-colors duration-100", onRowClick && "cursor-pointer hover:bg-[var(--gov-bg-subtle)] focus-visible:bg-[var(--gov-bg-subtle)] outline-none")}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5 text-[var(--gov-text)]", col.className)}>
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

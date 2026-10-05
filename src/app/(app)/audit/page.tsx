"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/lib/use-api";
import type { AuditEvent, PaginatedResponse } from "@/types";
import { ShieldCheck, ShieldAlert } from "lucide-react";

function AuditContent() {
  const params = useSearchParams();
  const { t } = useLocale();
  const [input, setInput] = useState(params.get("recordId") ?? "");
  const [filter, setFilter] = useState(params.get("recordId") ?? "");
  const [page, setPage] = useState(1);
  const [check, setCheck] = useState(0);

  const qs = new URLSearchParams({ pageSize: "30", page: String(page) });
  if (filter.startsWith("DOC-")) qs.set("documentId", filter);
  else if (filter) qs.set("recordId", filter);
  const { data, error, initialLoading, reload } = useApi<PaginatedResponse<AuditEvent>>(`/api/audit?${qs}`);
  const chain = useApi<{ valid: boolean; checked: number; brokenAtSeq?: number }>(check ? `/api/audit/verify?n=${check}` : null);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageTitle
        title="Audit log"
        description="Every action is appended to a SHA-256 hash chain: editing, inserting or deleting any entry breaks every later hash."
        actions={
        <div className="flex items-center gap-3">
          {chain.data && (
            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${chain.data.valid ? "text-[var(--gov-green)]" : "text-red-700"}`}>
              {chain.data.valid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {chain.data.valid ? t("Chain intact ({n} entries)", { n: chain.data.checked }) : t("Broken at #{n}", { n: chain.data.brokenAtSeq ?? "?" })}
            </span>
          )}
          <Button variant="outline" size="sm" loading={chain.loading} onClick={() => setCheck((n) => n + 1)}>
            {t("Verify chain")}
          </Button>
        </div>
        }
      />

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setFilter(input.trim());
        }}
      >
        <Input className="max-w-sm" placeholder={t("Filter by record ID (LR-…) or document ID (DOC-…)")} value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" variant="outline">{t("Filter")}</Button>
        {filter && (
          <Button type="button" variant="ghost" onClick={() => { setInput(""); setFilter(""); setPage(1); }}>
            {t("Clear")}
          </Button>
        )}
      </form>

      <Card>
        {initialLoading ? (
          <LoadingState />
        ) : !data ? (
          <ErrorState message={error || "Could not load audit log"} onRetry={reload} />
        ) : (
          <>
            <AuditTimeline events={data.items} variant="full" />
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <AppLayout title="Audit log">
      <Suspense fallback={<LoadingState />}>
        <AuditContent />
      </Suspense>
    </AppLayout>
  );
}

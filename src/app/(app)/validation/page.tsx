"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { ValidationSummary } from "@/components/validation/ValidationSummary";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { ValidationStatusBadge, RecordStatusBadge } from "@/components/ui/StatusBadges";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import type { LandRecord, PaginatedResponse } from "@/types";

function SingleRecord({ recordId }: { recordId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const { data, error, initialLoading } = useApi<{ record: LandRecord }>(`/api/records/${recordId}`);
  if (initialLoading) return <LoadingState />;
  if (!data?.record.validation) return <ErrorState message={error || "Validation result not found"} />;
  const { record } = data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--gov-navy)]">{record.owner_name}</h3>
          <p className="text-sm text-[var(--gov-text-muted)]">{record.record_id} · {t("Khasra")} {record.khasra_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/validation")}>{t("Back to list")}</Button>
          <Link href={`/records/${record.record_id}`}><Button variant="outline" size="sm">{t("Record")}</Button></Link>
          {record.status === "VERIFICATION_REQUIRED" && (
            <Link href={`/verification/${record.record_id}`}><Button size="sm">{t("Verify")}</Button></Link>
          )}
        </div>
      </div>
      <ValidationSummary validation={record.validation!} />
    </div>
  );
}

function ValidationList() {
  const router = useRouter();
  const { t } = useLocale();
  const params = useSearchParams();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const duplicates = params.get("duplicates") === "1";
  const qs = new URLSearchParams({ pageSize: "20", page: String(page) });
  if (filter) qs.set("validationStatus", filter);
  if (duplicates) qs.set("duplicates", "1");
  const { data, error, initialLoading, reload } = useApi<PaginatedResponse<LandRecord>>(`/api/records?${qs}`);

  return (
    <div className="space-y-6">
      <PageTitle title="Validation results" description="Rule checks, master-data matches, duplicates and history comparison for every record." />
      <div className="flex flex-wrap gap-2">
        {["", "VALID", "REVIEW_REQUIRED", "INVALID"].map((s) => (
          <Button key={s || "all"} variant={filter === s ? "primary" : "outline"} size="sm" onClick={() => { setFilter(s); setPage(1); }}>
            {t(s ? ({ VALID: "Valid", REVIEW_REQUIRED: "Review required", INVALID: "Invalid" } as Record<string, string>)[s] : "All results")}
          </Button>
        ))}
        <Button variant={duplicates ? "primary" : "outline"} size="sm" onClick={() => router.push(duplicates ? "/validation" : "/validation?duplicates=1")}>
          {t("Duplicates only")}
        </Button>
      </div>
      {initialLoading ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message={error || "Could not load"} onRetry={reload} />
      ) : (
        <>
          <DataTable
            keyField="record_id"
            data={data.items.filter((r) => r.validation)}
            columns={[
              { key: "record_id", header: "Record", render: (r) => <span className="font-mono text-xs">{r.record_id}</span> },
              { key: "owner_name", header: "Owner" },
              { key: "khasra_number", header: "Khasra" },
              { key: "village", header: "Village", render: (r) => (r.village ? t(r.village) : "—") },
              { key: "score", header: "Score", render: (r) => r.validation?.validation_score ?? "—" },
              { key: "vstatus", header: "Validation", render: (r) => (r.validation ? <ValidationStatusBadge status={r.validation.validation_status} /> : null) },
              { key: "issues", header: "Issues", render: (r) => t("{e} errors · {w} warnings", { e: r.validation?.errors.length ?? 0, w: r.validation?.warnings.length ?? 0 }) },
              { key: "status", header: "Record", render: (r) => <RecordStatusBadge status={r.status} /> },
            ]}
            onRowClick={(r) => router.push(`/validation?recordId=${r.record_id}`)}
            emptyTitle="No validation results"
            emptyDescription="Process documents to generate validation results."
          />
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ValidationContent() {
  const recordId = useSearchParams().get("recordId");
  return recordId ? <SingleRecord recordId={recordId} /> : <ValidationList />;
}

export default function ValidationPage() {
  return (
    <AppLayout title="Validation">
      <Suspense fallback={<LoadingState />}>
        <ValidationContent />
      </Suspense>
    </AppLayout>
  );
}

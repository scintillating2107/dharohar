"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Field";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { hasPermission } from "@/lib/config";
import { formatDateShort, formatFileSize } from "@/lib/utils";
import type { Document, PaginatedResponse } from "@/types";
import { Search, Upload } from "lucide-react";

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "UPLOADED", label: "Uploaded" },
  { value: "QUEUED", label: "Queued" },
  { value: "VERIFICATION_REQUIRED", label: "Needs verification" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "FAILED", label: "Failed" },
];
const IN_FLIGHT = ["QUEUED", "PROCESSING", "IMAGE_PROCESSING", "OCR_PROCESSING", "EXTRACTION_PROCESSING", "VALIDATION_PROCESSING"];

function DocumentsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [query, setQuery] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (query) qs.set("search", query);
  if (status) qs.set("status", status);
  const { data, error, initialLoading, reload } = useApi<PaginatedResponse<Document>>(`/api/documents?${qs}`, { pollMs: 5000 });

  return (
    <div>
      <PageTitle
        title="Documents"
        description="Uploaded scans and their processing status. The list refreshes automatically."
        actions={
          user && hasPermission(user.role, "upload") ? (
            <Link href="/documents/upload">
              <Button>
                <Upload className="h-4 w-4" /> {t("Upload")}
              </Button>
            </Link>
          ) : undefined
        }
      />

      <form
        className="flex flex-col sm:flex-row gap-2 mb-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <Input className="sm:max-w-sm" placeholder={t("Search name, document ID, district...")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("Search documents")} />
        <Select
          className="sm:max-w-[220px]"
          value={status}
          aria-label={t("Status")}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.label)}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" /> {t("Search")}
        </Button>
      </form>

      {initialLoading ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message={error || "Failed to load documents"} onRetry={reload} />
      ) : (
        <>
          <DataTable
            keyField="id"
            data={data.items}
            columns={[
              {
                key: "name",
                header: "Document",
                render: (d) => (
                  <span className="block max-w-[260px]">
                    <span className="block truncate font-medium">{d.name}</span>
                    <span className="block font-mono text-[11px] text-[var(--gov-text-muted)]">{d.id}</span>
                  </span>
                ),
              },
              { key: "district", header: "District", render: (d) => (d.district ? t(d.district) : "—") },
              { key: "pageCount", header: "Pages", render: (d) => d.pageCount || "—" },
              { key: "fileSize", header: "Size", render: (d) => formatFileSize(d.fileSize) },
              {
                key: "status",
                header: "Status",
                render: (d) => (
                  <span className="inline-flex items-center gap-2">
                    <ProcessingStatusBadge status={d.status} />
                    {IN_FLIGHT.includes(d.status) && <span className="h-2 w-2 rounded-full bg-[var(--gov-navy-light)] animate-pulse" aria-hidden="true" />}
                  </span>
                ),
              },
              {
                key: "uploadedAt",
                header: "Uploaded",
                render: (d) => (
                  <span className="whitespace-nowrap">
                    {formatDateShort(d.uploadedAt)}
                    <span className="block text-xs text-[var(--gov-text-muted)]">{d.uploadedByName}</span>
                  </span>
                ),
              },
            ]}
            onRowClick={(d) => router.push(`/documents/${d.id}`)}
            emptyTitle={query || status ? "No documents match these filters" : "No documents yet"}
            emptyDescription={query || status ? "Try a different search or status." : "Upload a scanned land record to get started."}
          />
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function DocumentsKeyed() {
  const params = useSearchParams();
  return <DocumentsContent key={`${params.get("search") ?? ""}|${params.get("status") ?? ""}`} />;
}

export default function DocumentsPage() {
  return (
    <AppLayout title="Documents">
      <Suspense fallback={<LoadingState />}>
        <DocumentsKeyed />
      </Suspense>
    </AppLayout>
  );
}

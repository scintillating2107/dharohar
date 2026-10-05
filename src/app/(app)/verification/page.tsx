"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { ConfidenceBadge, ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Field";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi, useSystemSettings } from "@/lib/use-api";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDateShort } from "@/lib/utils";
import type { VerificationTask, PaginatedResponse } from "@/types";
import { Search } from "lucide-react";

const STATUSES = [
  { value: "OPEN", label: "Open (pending + in review)" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SENT_BACK", label: "Sent back" },
  { value: "ALL", label: "All" },
];

const PRIORITY: Record<string, { label: string; variant: "error" | "warning" | "info" | "neutral" }> = {
  URGENT: { label: "Urgent", variant: "error" },
  HIGH: { label: "High", variant: "warning" },
  MEDIUM: { label: "Medium", variant: "info" },
  LOW: { label: "Low", variant: "neutral" },
};

const TASK_STATUS: Record<string, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SENT_BACK: "Sent back",
};

export default function VerificationQueuePage() {
  const router = useRouter();
  const { t } = useLocale();
  const settings = useSystemSettings();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [lowConfidence, setLowConfidence] = useState(false);
  const [validationIssue, setValidationIssue] = useState(false);

  const qs = new URLSearchParams({ pageSize: "15", page: String(page), status });
  if (query) qs.set("search", query);
  if (district) qs.set("district", district);
  if (lowConfidence) qs.set("lowConfidence", "true");
  if (validationIssue) qs.set("validationIssue", "true");
  const { data, error, initialLoading, reload } = useApi<PaginatedResponse<VerificationTask>>(`/api/verification?${qs}`, { pollMs: 15000 });
  const districts = useApi<{ districts: string[] }>("/api/meta/locations").data?.districts ?? [];
  const filtered = Boolean(query || district || lowConfidence || validationIssue || status !== "OPEN");

  return (
    <AppLayout title="Verification queue">
      <PageTitle title="Verification queue" description="Highest priority first: invalid and urgent records, then low confidence and likely duplicates." />

      <form
        className="grid grid-cols-2 md:flex md:flex-wrap gap-2 items-center mb-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <Input className="col-span-2 md:max-w-xs" placeholder={t("Owner, khasra, village or record ID")} aria-label={t("Search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="md:max-w-[230px]" value={status} aria-label={t("Status")} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{t(s.label)}</option>
          ))}
        </Select>
        <Select className="md:max-w-[200px]" value={district} aria-label={t("District")} onChange={(e) => { setDistrict(e.target.value); setPage(1); }}>
          <option value="">{t("All districts")}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{t(d)}</option>
          ))}
        </Select>
        <Button type="button" variant={lowConfidence ? "primary" : "outline"} size="sm" aria-pressed={lowConfidence} onClick={() => { setLowConfidence(!lowConfidence); setPage(1); }}>
          {t("Low confidence")}
        </Button>
        <Button type="button" variant={validationIssue ? "primary" : "outline"} size="sm" aria-pressed={validationIssue} onClick={() => { setValidationIssue(!validationIssue); setPage(1); }}>
          {t("Validation issues")}
        </Button>
        <Button type="submit" variant="outline" size="sm">
          <Search className="h-4 w-4" /> {t("Search")}
        </Button>
      </form>

      {initialLoading ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message={error || "Could not load queue"} onRetry={reload} />
      ) : (
        <>
          <DataTable
            keyField="id"
            data={data.items}
            columns={[
              { key: "priority", header: "Priority", render: (x) => <Badge variant={PRIORITY[x.priority]?.variant ?? "neutral"}>{t(PRIORITY[x.priority]?.label ?? x.priority)}</Badge> },
              {
                key: "recordId",
                header: "Record",
                render: (x) => (
                  <span>
                    <span className="block font-medium">{x.ownerName || "—"}</span>
                    <span className="block font-mono text-[11px] text-[var(--gov-text-muted)]">{x.recordId}</span>
                  </span>
                ),
              },
              { key: "khasraNumber", header: "Khasra", render: (x) => x.khasraNumber || "—" },
              { key: "village", header: "Village", render: (x) => [x.village, x.district].filter(Boolean).join(", ") || "—" },
              { key: "confidence", header: "Confidence", render: (x) => <ConfidenceBadge confidence={x.confidence} reviewThreshold={settings?.reviewThreshold} /> },
              { key: "validationStatus", header: "Validation", render: (x) => <ValidationStatusBadge status={x.validationStatus} /> },
              { key: "status", header: "Status", render: (x) => t(TASK_STATUS[x.status] ?? x.status) },
              { key: "createdAt", header: "Queued", render: (x) => <span className="whitespace-nowrap">{formatDateShort(x.createdAt)}</span> },
            ]}
            onRowClick={(x) => router.push(`/verification/${x.recordId}`)}
            emptyTitle={filtered ? "No records match these filters" : "The queue is empty"}
            emptyDescription={filtered ? "Try clearing a filter." : "Processed documents appear here for officer review."}
          />
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
        </>
      )}
    </AppLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { ConfidenceBadge, ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import { formatDateShort } from "@/lib/utils";
import type { VerificationTask, PaginatedResponse } from "@/types";
import { CheckSquare } from "lucide-react";

const DISTRICTS = ["Lucknow", "Malihabad"];
const STATUSES = ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "SENT_BACK"];

export default function VerificationQueuePage() {
  const [data, setData] = useState<PaginatedResponse<VerificationTask> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [lowConfidence, setLowConfidence] = useState(false);
  const [validationIssue, setValidationIssue] = useState(false);
  const router = useRouter();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "10", page: String(p) });
      if (search) params.set("search", search);
      if (district) params.set("district", district);
      if (status) params.set("status", status);
      if (lowConfidence) params.set("lowConfidence", "true");
      if (validationIssue) params.set("validationIssue", "true");
      const result = await apiGet<PaginatedResponse<VerificationTask>>(`/api/verification?${params}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page, district, status, lowConfidence, validationIssue]);

  return (
    <AppLayout title="Verification Queue">
      <div className="space-y-6">
        <DashboardHero
          eyebrow="Human-in-the-loop"
          title="Verification queue"
          description="Low-confidence and validation-flagged records require officer review — study requirement for accurate digital land administration."
          icon={CheckSquare}
          accent="saffron"
        />

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          onSearch={() => { setPage(1); load(1); }}
          placeholder="Search by owner, khasra, village..."
          filters={
            <>
              <select
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
                className="rounded-md border border-[var(--gov-border)] bg-white px-3 py-1.5 text-sm text-[var(--gov-navy)]"
              >
                <option value="">All Districts</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="rounded-md border border-[var(--gov-border)] bg-white px-3 py-1.5 text-sm text-[var(--gov-navy)]"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <Button
                variant={lowConfidence ? "primary" : "outline"}
                size="sm"
                onClick={() => { setLowConfidence(!lowConfidence); setPage(1); }}
              >
                Low Confidence
              </Button>
              <Button
                variant={validationIssue ? "primary" : "outline"}
                size="sm"
                onClick={() => { setValidationIssue(!validationIssue); setPage(1); }}
              >
                Validation Issues
              </Button>
            </>
          }
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              keyField="id"
              data={data?.items || []}
              columns={[
                { key: "recordId", header: "Record ID" },
                { key: "ownerName", header: "Owner" },
                { key: "village", header: "Village" },
                { key: "khasraNumber", header: "Khasra" },
                { key: "confidence", header: "Confidence", render: (t) => <ConfidenceBadge confidence={t.confidence} /> },
                { key: "validationStatus", header: "Validation", render: (t) => <ValidationStatusBadge status={t.validationStatus} /> },
                {
                  key: "priority",
                  header: "Priority",
                  render: (t) => (
                    <Badge variant={t.priority === "URGENT" || t.priority === "HIGH" ? "warning" : "neutral"}>
                      {t.priority}
                    </Badge>
                  ),
                },
                { key: "createdAt", header: "Created", render: (t) => formatDateShort(t.createdAt) },
                {
                  key: "action",
                  header: "Action",
                  render: (t) => (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/verification/${t.recordId}`); }}>
                      Review
                    </Button>
                  ),
                },
              ]}
              onRowClick={(t) => router.push(`/verification/${t.recordId}`)}
              emptyTitle="No verification tasks"
              emptyDescription="All records have been verified."
            />
            {data && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

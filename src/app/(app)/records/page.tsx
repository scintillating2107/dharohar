"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/States";
import { RecordIdLink } from "@/components/records/RecordIdLink";
import { apiGet } from "@/lib/api-client";
import { formatConfidence } from "@/lib/utils";
import type { LandRecord, PaginatedResponse } from "@/types";

const DISTRICTS = ["", "Lucknow", "Kanpur", "Agra"];
const STATUSES = ["", "VERIFIED", "VERIFICATION_REQUIRED", "REJECTED"];

function RecordsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<LandRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const router = useRouter();

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStatusFilter(searchParams.get("status") || "");
    setPage(1);
  }, [searchParams]);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "10", page: String(p) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (district) params.set("district", district);
      const result = await apiGet<PaginatedResponse<LandRecord>>(`/api/records?${params}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page, statusFilter, district, search]);

  const statusVariant = (status: string) => {
    if (status === "VERIFIED") return "success";
    if (status === "REJECTED") return "error";
    if (status === "VERIFICATION_REQUIRED") return "warning";
    return "neutral";
  };

  const statusLabel = (status: string) => {
    if (status === "VERIFICATION_REQUIRED") return "Review";
    return status.replace(/_/g, " ");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gov-navy)]">Document repository</h1>
          <p className="text-sm text-[var(--gov-text-muted)]">Verified and in-progress land records (canonical record ID).</p>
        </div>
        <Link href="/documents/upload">
          <Button variant="outline" size="sm">Upload new</Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input placeholder="Search village, khasra, ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1); }} className="rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm">
          {DISTRICTS.map((d) => <option key={d || "all"} value={d}>{d || "All districts"}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm">
          {STATUSES.map((s) => <option key={s || "all"} value={s}>{s ? statusLabel(s) : "All statuses"}</option>)}
        </select>
        <Button onClick={() => { setPage(1); load(1); }}>Apply filters</Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <DataTable
            keyField="record_id"
            data={data?.items || []}
            columns={[
              {
                key: "record_id",
                header: "Record ID",
                render: (r) => <RecordIdLink recordId={r.record_id} />,
              },
              { key: "village", header: "Village" },
              { key: "district", header: "District" },
              {
                key: "year",
                header: "Year",
                render: (r) => String(r.record_year ?? r.createdAt?.slice(0, 4) ?? "—"),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>,
              },
              {
                key: "confidence",
                header: "Confidence",
                render: (r) => formatConfidence(r.averageConfidence),
              },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        r.status === "VERIFICATION_REQUIRED"
                          ? `/verification/${r.record_id}`
                          : `/records/${r.record_id}`
                      );
                    }}
                  >
                    {r.status === "VERIFICATION_REQUIRED" ? "Review" : "View"}
                  </Button>
                ),
              },
            ]}
            onRowClick={(r) => router.push(`/records/${r.record_id}`)}
            emptyTitle="No records in repository"
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
  );
}

export default function RecordsPage() {
  return (
    <AppLayout title="Land records">
      <Suspense fallback={<LoadingState />}>
        <RecordsContent />
      </Suspense>
    </AppLayout>
  );
}

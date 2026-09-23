"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "@/components/ui/StatusBadges";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import { formatDateShort } from "@/lib/utils";
import type { LandRecord, PaginatedResponse } from "@/types";

export default function RecordsPage() {
  const [data, setData] = useState<PaginatedResponse<LandRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const router = useRouter();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "10", page: String(p) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const result = await apiGet<PaginatedResponse<LandRecord>>(`/api/records?${params}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page, statusFilter]);

  const statusVariant = (status: string) => {
    if (status === "VERIFIED") return "success";
    if (status === "REJECTED") return "error";
    if (status === "VERIFICATION_REQUIRED") return "warning";
    return "neutral";
  };

  return (
    <AppLayout title="Land Records">
      <div className="space-y-6">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          onSearch={() => { setPage(1); load(1); }}
          placeholder="Search by owner, khasra, village, district..."
          filters={
            <>
              {["", "VERIFIED", "VERIFICATION_REQUIRED", "REJECTED"].map((s) => (
                <Button
                  key={s || "all"}
                  variant={statusFilter === s ? "primary" : "outline"}
                  size="sm"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                >
                  {s ? s.replace(/_/g, " ") : "All"}
                </Button>
              ))}
            </>
          }
        />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              keyField="record_id"
              data={data?.items || []}
              columns={[
                { key: "record_id", header: "Record ID" },
                { key: "owner_name", header: "Owner" },
                { key: "khasra_number", header: "Khasra" },
                { key: "khata_number", header: "Khata" },
                { key: "village", header: "Village" },
                { key: "district", header: "District" },
                { key: "area", header: "Area", render: (r) => `${r.area} ${r.area_unit}` },
                { key: "confidence", header: "Confidence", render: (r) => <ConfidenceBadge confidence={r.averageConfidence} /> },
                { key: "status", header: "Status", render: (r) => <Badge variant={statusVariant(r.status)}>{r.status.replace(/_/g, " ")}</Badge> },
                { key: "createdAt", header: "Created", render: (r) => formatDateShort(r.createdAt) },
              ]}
              onRowClick={(r) => router.push(`/records/${r.record_id}`)}
              emptyTitle="No records found"
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

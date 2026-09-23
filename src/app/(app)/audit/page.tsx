"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { Pagination } from "@/components/ui/Pagination";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api-client";
import type { AuditEvent, PaginatedResponse } from "@/types";

export default function AuditPage() {
  const [data, setData] = useState<PaginatedResponse<AuditEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState("");
  const [page, setPage] = useState(1);

  const load = async (filter?: string, p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "20", page: String(p) });
      if (filter) params.set("recordId", filter);
      const result = await apiGet<PaginatedResponse<AuditEvent>>(`/api/audit?${params}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(recordId, page); }, [page]);

  return (
    <AppLayout title="Audit Logs">
      <div className="space-y-6 max-w-3xl">
        <SearchFilter
          search={recordId}
          onSearchChange={setRecordId}
          onSearch={() => { setPage(1); load(recordId, 1); }}
          placeholder="Filter by Record ID..."
          filters={
            recordId ? (
              <Button variant="ghost" size="sm" onClick={() => { setRecordId(""); setPage(1); load("", 1); }}>
                Clear
              </Button>
            ) : undefined
          }
        />

        <Card title="Audit Trail">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              <AuditTimeline events={data?.items || []} />
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
        </Card>
      </div>
    </AppLayout>
  );
}

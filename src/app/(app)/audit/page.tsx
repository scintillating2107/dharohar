"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { Pagination } from "@/components/ui/Pagination";
import { SearchFilter } from "@/components/ui/SearchFilter";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api-client";
import type { AuditEvent, PaginatedResponse } from "@/types";

function AuditContent() {
  const searchParams = useSearchParams();
  const initialRecord = searchParams.get("recordId") || "";
  const [data, setData] = useState<PaginatedResponse<AuditEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState(initialRecord);
  const [page, setPage] = useState(1);

  const load = async (filter?: string, p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "30", page: String(p) });
      if (filter) params.set("recordId", filter);
      const result = await apiGet<PaginatedResponse<AuditEvent>>(`/api/audit?${params}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRecordId(initialRecord);
  }, [initialRecord]);

  useEffect(() => {
    load(recordId, page);
  }, [page, recordId]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--gov-navy)]">Complete record history</h1>
        <p className="text-sm text-[var(--gov-text-muted)] mt-1">
          End-to-end audit trail from upload through verification and certification.
        </p>
      </div>

      <SearchFilter
        search={recordId}
        onSearchChange={setRecordId}
        onSearch={() => { setPage(1); load(recordId, 1); }}
        placeholder="Filter by Record ID..."
        filters={
          recordId ? (
            <Button variant="ghost" size="sm" onClick={() => { setRecordId(""); setPage(1); }}>
              Clear
            </Button>
          ) : undefined
        }
      />

      <Card title="Timeline">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <AuditTimeline events={data?.items || []} variant="full" />
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
  );
}

export default function AuditPage() {
  return (
    <AppLayout title="Audit trail">
      <Suspense fallback={<LoadingState />}>
        <AuditContent />
      </Suspense>
    </AppLayout>
  );
}

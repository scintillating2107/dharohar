"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ValidationSummary } from "@/components/validation/ValidationSummary";
import { DataTable } from "@/components/ui/DataTable";
import { ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { LandRecord, PaginatedResponse } from "@/types";

function ValidationContent() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get("recordId");
  const router = useRouter();
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        if (recordId) {
          const data = await apiGet<{ record: LandRecord }>(`/api/records/${recordId}`);
          setRecord(data.record);
        } else {
          const data = await apiGet<PaginatedResponse<LandRecord>>("/api/records?pageSize=50");
          setRecords(data.items.filter((r) => r.validation));
        }
      } catch {
        setRecord(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [recordId]);

  if (loading) return <LoadingState />;

  if (recordId && !record) return <ErrorState message="Record not found" />;

  if (recordId && record?.validation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{record.owner_name}</h3>
            <p className="text-sm text-slate-500">{record.record_id} · Khasra {record.khasra_number}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/validation")}>
              Back to List
            </Button>
            <Link href={`/records/${record.record_id}`}>
              <Button variant="outline" size="sm">View Record</Button>
            </Link>
          </div>
        </div>
        <ValidationSummary validation={record.validation} />
      </div>
    );
  }

  const filtered = records.filter((r) => {
    if (!filter) return true;
    return r.validation?.validation_status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {["", "VALID", "REVIEW_REQUIRED", "INVALID"].map((s) => (
          <Button
            key={s || "all"}
            variant={filter === s ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s ? s.replace(/_/g, " ") : "All Results"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No validation results"
          description="Process documents to generate validation results."
        />
      ) : (
        <DataTable
          keyField="record_id"
          data={filtered}
          columns={[
            { key: "record_id", header: "Record ID" },
            { key: "owner_name", header: "Owner" },
            { key: "khasra_number", header: "Khasra" },
            { key: "village", header: "Village" },
            {
              key: "score",
              header: "Score",
              render: (r) => r.validation?.validation_score ?? "—",
            },
            {
              key: "status",
              header: "Status",
              render: (r) =>
                r.validation ? (
                  <ValidationStatusBadge status={r.validation.validation_status} />
                ) : null,
            },
            {
              key: "warnings",
              header: "Warnings",
              render: (r) => r.validation?.warnings.length ?? 0,
            },
            {
              key: "action",
              header: "",
              render: (r) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/validation?recordId=${r.record_id}`);
                  }}
                >
                  View
                </Button>
              ),
            },
          ]}
          onRowClick={(r) => router.push(`/validation?recordId=${r.record_id}`)}
        />
      )}
    </div>
  );
}

export default function ValidationPage() {
  return (
    <AppLayout title="Validation Results">
      <Suspense fallback={<LoadingState />}>
        <ValidationContent />
      </Suspense>
    </AppLayout>
  );
}

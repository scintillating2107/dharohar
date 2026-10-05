"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Record360, type RecordDetail } from "@/components/records/Record360";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, initialLoading, reload } = useApi<RecordDetail>(`/api/records/${id}`);

  return (
    <AppLayout title="Record 360°">
      {initialLoading ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message={error || "Record not found"} onRetry={reload} />
      ) : (
        <Suspense fallback={<LoadingState />}>
          <Record360 key={data.record.updatedAt} detail={data} />
        </Suspense>
      )}
    </AppLayout>
  );
}

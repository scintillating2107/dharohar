"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Record360 } from "@/components/records/Record360";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { LandRecord, Document, AuditEvent, Parcel } from "@/types";

export default function RecordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{
        record: LandRecord;
        document?: Document;
        auditEvents: AuditEvent[];
        parcel?: Parcel;
      }>(`/api/records/${id}`);
      setRecord(data.record);
      setDocument(data.document || null);
      setAuditEvents(data.auditEvents);
      setParcel(data.parcel || null);
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <AppLayout title="Record 360°"><LoadingState /></AppLayout>;
  if (!record) return <AppLayout title="Record"><ErrorState message="Record not found" onRetry={load} /></AppLayout>;

  return (
    <AppLayout title="Record 360°">
      <Suspense fallback={<LoadingState />}>
        <Record360
          record={record}
          document={document}
          auditEvents={auditEvents}
          parcel={parcel}
        />
      </Suspense>
    </AppLayout>
  );
}

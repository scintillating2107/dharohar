"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { FieldCard } from "@/components/records/ExtractedField";
import { ValidationSummary } from "@/components/validation/ValidationSummary";
import { HistoricalComparison } from "@/components/validation/HistoricalComparison";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { ConfidenceBadge, ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import { formatDate, formatConfidence } from "@/lib/utils";
import { FIELD_SECTIONS } from "@/lib/config";
import type { LandRecord, Document, AuditEvent, Parcel } from "@/types";
import { Map, CheckSquare } from "lucide-react";

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

  useEffect(() => { load(); }, [load]);

  if (loading) return <AppLayout title="Record"><LoadingState /></AppLayout>;
  if (!record) return <AppLayout title="Record"><ErrorState message="Record not found" onRetry={load} /></AppLayout>;

  return (
    <AppLayout title={`Record ${record.record_id}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{record.owner_name}</h3>
            <p className="text-sm text-slate-500">
              Khasra {record.khasra_number} · Khata {record.khata_number} · {record.village}, {record.district}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={record.averageConfidence} />
            <Badge variant={record.status === "VERIFIED" ? "success" : record.status === "REJECTED" ? "error" : "warning"}>
              {record.status.replace(/_/g, " ")}
            </Badge>
            {record.status === "VERIFICATION_REQUIRED" && (
              <Link href={`/verification/${record.record_id}`}>
                <Button size="sm"><CheckSquare className="h-4 w-4" /> Verify</Button>
              </Link>
            )}
            {parcel && (
              <Link href="/gis">
                <Button variant="outline" size="sm"><Map className="h-4 w-4" /> View on Map</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(FIELD_SECTIONS).map(([section, fields]) => (
              <Card key={section}>
                <FieldCard
                  title={section}
                  fields={fields}
                  recordFields={record.fields}
                />
              </Card>
            ))}

            {record.validation?.warnings && (
              <HistoricalComparison warnings={record.validation.warnings} />
            )}
          </div>

          <div className="space-y-6">
            <Card title="Confidence Summary">
              <p className="text-3xl font-bold text-slate-900">
                {formatConfidence(record.averageConfidence)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Average extraction confidence</p>
            </Card>

            {record.validation && (
              <Card title="Validation">
                <ValidationStatusBadge status={record.validation.validation_status} />
                <p className="text-sm text-slate-600 mt-2">
                  Score: {record.validation.validation_score}/100
                </p>
                <Link href={`/validation?recordId=${record.record_id}`} className="inline-block mt-3">
                  <Button variant="outline" size="sm">View Full Validation</Button>
                </Link>
              </Card>
            )}

            {document && (
              <Card title="Document">
                <p className="text-sm font-medium">{document.name}</p>
                <p className="text-xs text-slate-500 mt-1">{document.id}</p>
                <Link href={`/documents/${document.id}`} className="inline-block mt-3">
                  <Button variant="outline" size="sm">View Document</Button>
                </Link>
              </Card>
            )}

            <Card title="Audit History">
              <AuditTimeline events={auditEvents.slice(0, 10)} />
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

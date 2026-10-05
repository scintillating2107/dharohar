"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingStatusBadge, ValidationStatusBadge, ConfidenceBadge } from "@/components/ui/StatusBadges";
import { AIProcessingCenter } from "@/components/processing/AIProcessingCenter";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiPost } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { formatDate, formatFileSize, getFieldLabel } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { hasPermission } from "@/lib/config";
import type { Document, LandRecord } from "@/types";
import { ArrowLeft, Download, ExternalLink, Play, RotateCcw, ScanText, Image as ImageIcon, CheckSquare } from "lucide-react";

const IN_FLIGHT = ["QUEUED", "PROCESSING", "IMAGE_PROCESSING", "OCR_PROCESSING", "EXTRACTION_PROCESSING", "VALIDATION_PROCESSING"];

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, tx } = useLocale();
  const [busy, setBusy] = useState(false);
  const { data, error, initialLoading, reload } = useApi<{ document: Document; record: LandRecord | null }>(`/api/documents/${id}`, { pollMs: 3000 });

  const start = async () => {
    setBusy(true);
    try {
      await apiPost(`/api/documents/${id}/process`);
      toast("Processing queued", "success");
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start processing", "error");
    } finally {
      setBusy(false);
    }
  };

  if (initialLoading) return <AppLayout title="Document"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="Document"><ErrorState message={error || "Document not found"} onRetry={reload} /></AppLayout>;
  const { document, record } = data;
  const running = IN_FLIGHT.includes(document.status);
  const canVerify = user ? hasPermission(user.role, "verification") : false;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--gov-text-muted)]">{t(label)}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );

  return (
    <AppLayout title={document.name}>
      <div className="space-y-6 max-w-5xl">
        <Link href="/documents" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gov-navy-light)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("Documents")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--gov-navy)] break-words">{document.name}</h1>
            <p className="text-sm text-[var(--gov-text-muted)] font-mono">{document.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProcessingStatusBadge status={document.status} />
            {(document.status === "UPLOADED" || document.status === "FAILED") && (
              <Button onClick={start} loading={busy}>
                {document.status === "FAILED" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {document.status === "FAILED" ? t("Retry from failed step") : t("Start processing")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card title="Processing" className="lg:col-span-2" action={running ? <span className="text-xs text-[var(--gov-navy-light)]">{t("Updating live…")}</span> : undefined}>
            <AIProcessingCenter document={document} />
          </Card>

          <div className="space-y-6">
            <Card title="File">
              <dl className="space-y-2 text-sm">
                {row("Type", document.fileType)}
                {row("Size", formatFileSize(document.fileSize))}
                {row("Uploaded", <>{formatDate(document.uploadedAt)}<br />{document.uploadedByName}</>)}
                {document.recordType && row("Record type", t(document.recordType))}
                {document.district && row("District", t(document.district))}
                {document.recordYear && row("Record year", document.recordYear)}
                {document.priority === "urgent" && row("Priority", <span className="text-red-700 font-semibold">{t("Urgent")}</span>)}
                {document.sha256 && (
                  <div>
                    <dt className="text-[var(--gov-text-muted)]">SHA-256</dt>
                    <dd className="font-mono text-[10px] break-all">{document.sha256}</dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap gap-2 mt-4">
                <a href={`/api/documents/${id}/file?download=1`}>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4" /> {t("Original")}</Button>
                </a>
                <Link href={`/documents/${id}/quality`}>
                  <Button variant="outline" size="sm"><ImageIcon className="h-4 w-4" /> {t("Pages & quality")}</Button>
                </Link>
                {record?.ocr && (
                  <Link href={`/documents/${id}/ocr`}>
                    <Button variant="outline" size="sm"><ScanText className="h-4 w-4" /> {t("OCR text")}</Button>
                  </Link>
                )}
              </div>
            </Card>

            {record && (
              <Card title="Extracted record">
                <p className="font-mono text-sm text-[var(--gov-navy)]">{record.record_id}</p>
                <p className="text-sm mt-1">{record.owner_name || "—"} · {t("Khasra")} {record.khasra_number || "—"}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <ConfidenceBadge confidence={record.averageConfidence} />
                  {record.validation && <ValidationStatusBadge status={record.validation.validation_status} />}
                </div>
                {record.validation && record.validation.errors.length + record.validation.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs">
                    {record.validation.errors.map((e, i) => (
                      <li key={`e${i}`} className="text-red-700">• {t(getFieldLabel(e.field))}: {tx(e.message)}</li>
                    ))}
                    {record.validation.warnings.slice(0, 5).map((w, i) => (
                      <li key={`w${i}`} className="text-amber-800">• {tx(w.message)}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link href={`/records/${record.record_id}`}>
                    <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> {t("Record")}</Button>
                  </Link>
                  {canVerify && record.status === "VERIFICATION_REQUIRED" && (
                    <Link href={`/verification/${record.record_id}`}>
                      <Button size="sm"><CheckSquare className="h-4 w-4" /> {t("Verify")}</Button>
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

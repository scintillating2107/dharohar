"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { ProcessingTimeline } from "@/components/processing/ProcessingTimeline";
import { OCRPreview, ExtractionPreview } from "@/components/documents/ExtractionPreview";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet, apiPost } from "@/lib/api-client";
import { formatDate, formatFileSize } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import type { Document, LandRecord } from "@/types";
import { Play, ExternalLink, RotateCcw } from "lucide-react";

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ document: Document; record?: LandRecord }>(`/api/documents/${id}`);
      setDocument(data.document);
      setRecord(data.record || null);
    } catch {
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document && !["VERIFIED", "REJECTED", "FAILED", "UPLOADED"].includes(document.status)) {
        load();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [load, document?.status]);

  const startProcessing = async () => {
    setProcessing(true);
    try {
      await apiPost(`/api/documents/${id}/process`);
      toast("Processing started", "success");
      load();
    } catch {
      toast("Failed to start processing", "error");
    } finally {
      setProcessing(false);
    }
  };

  const retryProcessing = async () => {
    setProcessing(true);
    try {
      await apiPost(`/api/documents/${id}/retry`);
      toast("Processing retry started", "success");
      load();
    } catch {
      toast("Failed to retry processing", "error");
    } finally {
      setProcessing(false);
    }
  };

  const failedStep = document?.steps.find((s) => s.status === "failed");

  if (loading) return <AppLayout title="Document"><LoadingState /></AppLayout>;
  if (!document) return <AppLayout title="Document"><ErrorState message="Document not found" onRetry={load} /></AppLayout>;

  return (
    <AppLayout title="Document Details">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{document.name}</h3>
            <p className="text-sm text-slate-500">{document.id}</p>
          </div>
          <ProcessingStatusBadge status={document.status} />
        </div>

        <Card title="Document Information">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">File Type</dt><dd className="font-medium">{document.fileType}</dd></div>
            <div><dt className="text-slate-500">File Size</dt><dd className="font-medium">{formatFileSize(document.fileSize)}</dd></div>
            <div><dt className="text-slate-500">Pages</dt><dd className="font-medium">{document.pageCount}</dd></div>
            <div><dt className="text-slate-500">Uploaded</dt><dd className="font-medium">{formatDate(document.uploadedAt)}</dd></div>
            <div><dt className="text-slate-500">Uploaded By</dt><dd className="font-medium">{document.uploadedByName}</dd></div>
            {document.district && <div><dt className="text-slate-500">District</dt><dd className="font-medium">{document.district}</dd></div>}
          </dl>
        </Card>

        {document.status === "UPLOADED" && (
          <Button onClick={startProcessing} loading={processing}>
            <Play className="h-4 w-4" /> Start Processing
          </Button>
        )}

        {document.status === "FAILED" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Processing failed{failedStep ? ` at: ${failedStep.label}` : ""}
            </p>
            {failedStep?.error && (
              <p className="text-sm text-red-600 mt-1">{failedStep.error}</p>
            )}
            <div className="flex gap-3 mt-4">
              <Button onClick={retryProcessing} loading={processing}>
                <RotateCcw className="h-4 w-4" /> Retry Processing
              </Button>
              {record && (
                <Link href={`/verification/${record.record_id}`}>
                  <Button variant="outline">Send for Manual Review</Button>
                </Link>
              )}
            </div>
          </div>
        )}

        <Card title="Processing Pipeline">
          <ProcessingTimeline steps={document.steps} />
          <Link href={`/documents/${id}/processing`} className="inline-block mt-4">
            <Button variant="outline" size="sm">View Full Processing Status</Button>
          </Link>
        </Card>

        {record?.ocr && <OCRPreview ocr={record.ocr} />}
        {record && Object.keys(record.fields).length > 0 && (
          <ExtractionPreview extraction={{ document_id: document.id, fields: record.fields }} />
        )}

        {record && (
          <div className="flex gap-3">
            <Link href={`/records/${record.record_id}`}>
              <Button variant="outline"><ExternalLink className="h-4 w-4" /> View Extracted Record</Button>
            </Link>
            {document.status === "VERIFICATION_REQUIRED" && (
              <Link href={`/verification/${record.record_id}`}>
                <Button>Open Verification</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { OCRResultsView } from "@/components/documents/OCRResultsView";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { useLocale } from "@/contexts/LocaleContext";
import type { Document, LandRecord, OCRResult } from "@/types";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function DocumentOCRPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const { data, error, initialLoading, reload } = useApi<{ document: Document; record: LandRecord | null; ocr: OCRResult | null }>(`/api/documents/${id}`);

  if (initialLoading) return <AppLayout title="OCR text"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="OCR text"><ErrorState message={error || "Document not found"} onRetry={reload} /></AppLayout>;
  if (!data.ocr) {
    return (
      <AppLayout title="OCR text">
        <ErrorState message="OCR output is not available yet. Complete processing first." onRetry={reload} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="OCR text">
      <div className="space-y-4">
        <Link href={`/documents/${id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gov-navy-light)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("Document")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--gov-navy)] break-words">{data.document.name}</h1>
            <p className="text-sm text-[var(--gov-text-muted)]">{t("Recognised text and word-level confidence on the enhanced page.")}</p>
          </div>
          {data.record && (
            <Link href={`/records/${data.record.record_id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> {t("Extracted record")}
              </Button>
            </Link>
          )}
        </div>
        <OCRResultsView document={data.document} ocr={data.ocr} />
      </div>
    </AppLayout>
  );
}

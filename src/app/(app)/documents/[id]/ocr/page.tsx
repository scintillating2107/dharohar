"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { OCRResultsView } from "@/components/documents/OCRResultsView";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { Document, LandRecord } from "@/types";
import { ExternalLink } from "lucide-react";

export default function DocumentOCRPage() {
  const params = useParams();
  const id = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, [load]);

  if (loading) return <AppLayout title="OCR results"><LoadingState /></AppLayout>;
  if (!document) return <AppLayout title="OCR results"><ErrorState message="Document not found" onRetry={load} /></AppLayout>;
  if (!record?.ocr) {
    return (
      <AppLayout title="OCR results">
        <ErrorState message="OCR output not available yet. Complete processing first." onRetry={load} />
        <Link href={`/documents/${id}/processing`} className="inline-block mt-4">
          <Button variant="outline">View processing</Button>
        </Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="OCR results">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--gov-text-muted)]">Side-by-side original scan and multilingual OCR output.</p>
          {record && (
            <Link href={`/records/${record.record_id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> Extracted record
              </Button>
            </Link>
          )}
        </div>
        <OCRResultsView document={document} ocr={record.ocr} />
      </div>
    </AppLayout>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { AIProcessingCenter } from "@/components/processing/AIProcessingCenter";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { Document } from "@/types";

export default function ProcessingPage() {
  const params = useParams();
  const id = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const doc = await apiGet<{ document: Document }>(`/api/documents/${id}`);
      setDocument(doc.document);
    } catch {
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <AppLayout title="Processing"><LoadingState /></AppLayout>;

  if (!document) {
    return <AppLayout title="AI processing"><ErrorState message="Document not found" onRetry={load} /></AppLayout>;
  }

  const showOcr = document.status !== "UPLOADED" && document.status !== "PROCESSING";

  return (
    <AppLayout title="AI processing center">
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-[var(--gov-navy)]">{document.name}</h3>
            <ProcessingStatusBadge status={document.status} />
          </div>
          <div className="flex gap-2">
            {showOcr && (
              <Link href={`/documents/${id}/ocr`}>
                <Button variant="outline" size="sm">OCR results</Button>
              </Link>
            )}
            {document.recordId && (
              <Link href={`/records/${document.recordId}`}>
                <Button size="sm">Extracted record</Button>
              </Link>
            )}
          </div>
        </div>

        <Card>
          <AIProcessingCenter document={document} />
        </Card>
      </div>
    </AppLayout>
  );
}

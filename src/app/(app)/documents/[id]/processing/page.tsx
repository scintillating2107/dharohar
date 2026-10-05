"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AIProcessingCenter } from "@/components/processing/AIProcessingCenter";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { useLocale } from "@/contexts/LocaleContext";
import type { Document } from "@/types";
import { ArrowLeft } from "lucide-react";

const DONE = ["VERIFICATION_REQUIRED", "VERIFIED", "REJECTED", "FAILED", "UPLOADED"];

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const { data, error, initialLoading, reload } = useApi<{ document: Document }>(`/api/documents/${id}`, { pollMs: 2000 });

  if (initialLoading) return <AppLayout title="Processing"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="Processing"><ErrorState message={error || "Document not found"} onRetry={reload} /></AppLayout>;
  const { document } = data;

  return (
    <AppLayout title="Processing">
      <div className="max-w-3xl space-y-5">
        <Link href={`/documents/${id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gov-navy-light)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("Document")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-bold text-[var(--gov-navy)] truncate">{document.name}</h1>
            <ProcessingStatusBadge status={document.status} />
          </div>
          {document.recordId && document.status === "VERIFICATION_REQUIRED" && (
            <Link href={`/verification/${document.recordId}`}>
              <Button size="sm">{t("Open verification")}</Button>
            </Link>
          )}
        </div>
        {!DONE.includes(document.status) && (
          <p className="text-sm text-[var(--gov-text-muted)] rounded-md bg-blue-50 border border-blue-100 p-3">
            {t("Processing runs in the background. You can leave this page — you will be notified when the record is ready for verification.")}
          </p>
        )}
        <Card>
          <AIProcessingCenter document={document} />
        </Card>
      </div>
    </AppLayout>
  );
}

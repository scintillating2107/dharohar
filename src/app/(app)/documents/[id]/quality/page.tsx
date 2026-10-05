"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentQualityPanel } from "@/components/documents/DocumentQualityPanel";
import { Button } from "@/components/ui/Button";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiPost } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { Document } from "@/types";
import { Play, ArrowLeft } from "lucide-react";

export default function DocumentQualityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();
  const [processing, setProcessing] = useState(false);
  const { data, error, initialLoading, reload } = useApi<{ document: Document }>(`/api/documents/${id}`);

  const startProcessing = async () => {
    setProcessing(true);
    try {
      await apiPost(`/api/documents/${id}/process`);
      toast("Processing queued", "success");
      router.push(`/documents/${id}/processing`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start processing", "error");
      setProcessing(false);
    }
  };

  if (initialLoading) return <AppLayout title="Pages & quality"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="Pages & quality"><ErrorState message={error || "Document not found"} onRetry={reload} /></AppLayout>;
  const { document } = data;

  return (
    <AppLayout title="Pages & quality">
      <div className="space-y-6">
        <Link href={`/documents/${id}`} className="inline-flex items-center gap-1 text-xs text-[var(--gov-navy-light)] font-semibold">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("Document")}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--gov-navy)] break-words">{document.name}</h1>
            <p className="text-sm text-[var(--gov-text-muted)]">{t("Measured scan quality before and after enhancement.")}</p>
          </div>
          <div className="flex items-center gap-3">
            <ProcessingStatusBadge status={document.status} />
            {(document.status === "UPLOADED" || document.status === "FAILED") && (
              <Button onClick={startProcessing} loading={processing}>
                <Play className="h-4 w-4" /> {t("Start processing")}
              </Button>
            )}
          </div>
        </div>
        <DocumentQualityPanel document={document} />
      </div>
    </AppLayout>
  );
}

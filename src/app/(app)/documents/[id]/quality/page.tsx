"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentQualityPanel } from "@/components/documents/DocumentQualityPanel";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet, apiPost } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import type { Document } from "@/types";
import { Play, ArrowLeft } from "lucide-react";

export default function DocumentQualityPage() {
  const params = useParams();
  const id = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ document: Document }>(`/api/documents/${id}`);
      setDocument(data.document);
    } catch {
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const enhance = async () => {
    setEnhancing(true);
    await new Promise((r) => setTimeout(r, 800));
    toast("Enhancement applied (demo)", "success");
    setEnhancing(false);
    load();
  };

  const startProcessing = async () => {
    setProcessing(true);
    try {
      await apiPost(`/api/documents/${id}/process`);
      toast("AI processing started", "success");
      router.push(`/documents/${id}/processing`);
    } catch {
      toast("Could not start processing", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <AppLayout title="Document quality"><LoadingState /></AppLayout>;
  if (!document) return <AppLayout title="Document quality"><ErrorState message="Document not found" onRetry={load} /></AppLayout>;

  return (
    <AppLayout title="Preview & quality">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/documents/upload" className="inline-flex items-center gap-1 text-xs text-[var(--gov-navy-light)] font-semibold mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Upload
            </Link>
            <h2 className="text-xl font-bold text-[var(--gov-navy)]">{document.name}</h2>
            <p className="text-sm text-[var(--gov-text-muted)]">Review scan quality before OCR and extraction.</p>
          </div>
          <Button onClick={startProcessing} loading={processing}>
            <Play className="h-4 w-4" /> Start AI processing
          </Button>
        </div>

        <DocumentQualityPanel document={document} onEnhance={enhance} enhancing={enhancing} />
      </div>
    </AppLayout>
  );
}

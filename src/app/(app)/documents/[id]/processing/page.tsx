"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { ProcessingTimeline } from "@/components/processing/ProcessingTimeline";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { Document, ProcessingStep } from "@/types";

export default function ProcessingPage() {
  const params = useParams();
  const id = params.id as string;
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ steps: ProcessingStep[]; status: string }>(
        `/api/documents/${id}/process`
      );
      setSteps(data.steps);
      setStatus(data.status);
    } catch {
      const doc = await apiGet<{ document: Document }>(`/api/documents/${id}`);
      setSteps(doc.document.steps);
      setStatus(doc.document.status);
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

  return (
    <AppLayout title="Document Processing">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Processing Status</h3>
          <ProcessingStatusBadge status={status as Document["status"]} />
        </div>

        <Card title="Processing Timeline">
          <ProcessingTimeline steps={steps} />
        </Card>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-2">Pipeline Stages</p>
          <p>Upload → PDF Processing → Image Enhancement → Language Detection → OCR → Field Extraction → Validation → Human Verification → Final Storage</p>
        </div>
      </div>
    </AppLayout>
  );
}

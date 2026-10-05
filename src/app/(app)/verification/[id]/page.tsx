"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { VerificationWorkspace, type WorkspaceSubmit } from "@/components/verification/VerificationWorkspace";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiPost } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { AuditEvent, Document, ExtractedFieldValue, LandRecord, VerificationTask } from "@/types";
import { ArrowLeft } from "lucide-react";

interface VerificationData {
  task: VerificationTask;
  record: LandRecord;
  document: Document;
  auditEvents: AuditEvent[];
  aiFields: Record<string, ExtractedFieldValue> | null;
  settings: { reviewThreshold: number; makerChecker: boolean };
}

const MESSAGES = {
  save_draft: "Draft saved and re-validated",
  approve: "Record approved and certified",
  reject: "Record rejected",
  send_back: "Sent back for reprocessing",
};

export default function VerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const { data, error, initialLoading, reload } = useApi<VerificationData>(`/api/verification/${id}`);

  const onSubmit = async (s: WorkspaceSubmit) => {
    setBusy(true);
    try {
      await apiPost(`/api/verification/${id}`, s);
      toast(MESSAGES[s.action], s.action === "reject" ? "warning" : "success");
      if (s.action === "save_draft") {
        reload();
        setVersion((v) => v + 1);
      } else if (s.action === "approve") {
        router.push(`/records/${data?.record.record_id ?? id}?tab=certification`);
      } else {
        router.push("/verification");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (initialLoading) return <AppLayout title="Verification"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="Verification"><ErrorState message={error || "Verification task not found"} onRetry={reload} /></AppLayout>;

  return (
    <AppLayout title={t("Verify {id}", { id: data.record.record_id })}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/verification" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gov-navy-light)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("Verification queue")}
        </Link>
        <div className="flex gap-4 text-xs font-semibold">
          <Link href={`/records/${data.record.record_id}`} className="text-[var(--gov-navy-light)] hover:underline">{t("Record 360°")}</Link>
          <Link href={`/documents/${data.document.id}/ocr`} className="text-[var(--gov-navy-light)] hover:underline">{t("OCR text")}</Link>
          <Link href={`/compare?recordId=${data.record.record_id}`} className="text-[var(--gov-navy-light)] hover:underline">{t("Compare")}</Link>
        </div>
      </div>
      <h1 className="sr-only">{t("Verify {id}", { id: data.record.record_id })}</h1>
      <VerificationWorkspace
        key={`${data.record.updatedAt}-${version}`}
        task={data.task}
        record={data.record}
        document={data.document}
        auditEvents={data.auditEvents}
        aiFields={data.aiFields}
        reviewThreshold={data.settings.reviewThreshold}
        makerChecker={data.settings.makerChecker}
        currentUserId={user?.id ?? ""}
        busy={busy}
        onSubmit={onSubmit}
      />
    </AppLayout>
  );
}

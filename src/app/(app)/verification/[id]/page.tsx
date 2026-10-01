"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { VerificationWorkspace } from "@/components/verification/VerificationWorkspace";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet, apiPost } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import type { AuditEvent, LandRecord, Document, VerificationTask } from "@/types";

export default function VerificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = useState<VerificationTask | null>(null);
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{
        task: VerificationTask;
        record: LandRecord;
        document: Document;
        auditEvents: AuditEvent[];
      }>(`/api/verification/${id}`);
      setTask(data.task);
      setRecord(data.record);
      setDocument(data.document);
      setAuditEvents(data.auditEvents || []);
      const initial: Record<string, string> = {};
      Object.entries(data.record.fields).forEach(([k, v]) => {
        initial[k] = v.value;
      });
      setEditedFields(initial);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      await apiPost(`/api/verification/${id}`, {
        action,
        fields: editedFields,
        comment,
      });
      const messages: Record<string, string> = {
        save_draft: "Edits saved",
        approve: "Record approved",
        reject: "Record rejected",
      };
      toast(messages[action] || "Done", action === "reject" ? "warning" : "success");
      if (action === "approve" || action === "reject") {
        router.push("/verification");
      } else {
        load();
      }
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <AppLayout title="Verification"><LoadingState /></AppLayout>;
  if (!task || !record || !document) {
    return <AppLayout title="Verification"><ErrorState message="Verification task not found" onRetry={load} /></AppLayout>;
  }

  return (
    <AppLayout title="Human verification">
      <div className="space-y-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/verification" className="text-xs font-semibold text-[var(--gov-navy-light)]">
          ← Verification queue
        </Link>
        <div className="flex gap-2">
          <Link href={`/compare?recordId=${record.record_id}`}>
            <Button variant="outline" size="sm">Historical comparison</Button>
          </Link>
          <Link href={`/audit?recordId=${record.record_id}`}>
            <Button variant="outline" size="sm">Full audit trail</Button>
          </Link>
        </div>
      </div>

      <VerificationWorkspace
        task={task}
        record={record}
        document={document}
        auditEvents={auditEvents}
        editedFields={editedFields}
        onFieldChange={(key, value) => setEditedFields((prev) => ({ ...prev, [key]: value }))}
        comment={comment}
        onCommentChange={setComment}
        onAction={handleAction}
        actionLoading={actionLoading}
      />
    </AppLayout>
  );
}

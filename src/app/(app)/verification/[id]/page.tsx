"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { FieldCard } from "@/components/records/ExtractedField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { ValidationStatusBadge, ConfidenceBadge } from "@/components/ui/StatusBadges";
import { apiGet, apiPost } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import { LowConfidenceSummary } from "@/components/verification/LowConfidenceSummary";
import { FIELD_SECTIONS } from "@/lib/config";
import type { LandRecord, Document, VerificationTask, OCRRegion } from "@/types";

type PendingAction = "approve" | "reject" | "send_back" | null;

export default function VerificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = useState<VerificationTask | null>(null);
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [highlightedField, setHighlightedField] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{
        task: VerificationTask;
        record: LandRecord;
        document: Document;
      }>(`/api/verification/${id}`);
      setTask(data.task);
      setRecord(data.record);
      setDocument(data.document);
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

  useEffect(() => { load(); }, [load]);

  const regions: OCRRegion[] =
    record?.ocr?.pages.flatMap((p) => p.regions) || [];

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      await apiPost(`/api/verification/${id}`, {
        action,
        fields: editedFields,
        comment,
      });
      const messages: Record<string, string> = {
        save_draft: "Draft saved",
        approve: "Record approved",
        reject: "Record rejected",
        send_back: "Record sent back",
      };
      toast(messages[action] || "Action completed", action === "reject" ? "warning" : "success");
      setPendingAction(null);
      router.push("/verification");
    } catch {
      toast("Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmMessages: Record<string, { title: string; message: string; variant: "primary" | "danger" }> = {
    approve: {
      title: "Approve Record",
      message: `Confirm approval of record ${record?.record_id} for ${record?.owner_name}. This will mark the record as verified and update GIS status.`,
      variant: "primary",
    },
    reject: {
      title: "Reject Record",
      message: `Reject record ${record?.record_id}? This action will mark the record as rejected and cannot be undone without re-processing.`,
      variant: "danger",
    },
    send_back: {
      title: "Send Back for Re-processing",
      message: `Send record ${record?.record_id} back for re-processing or re-upload?`,
      variant: "primary",
    },
  };

  if (loading) return <AppLayout title="Verification"><LoadingState /></AppLayout>;
  if (!task || !record || !document) {
    return <AppLayout title="Verification"><ErrorState message="Verification task not found" onRetry={load} /></AppLayout>;
  }

  return (
    <AppLayout title="Human Verification">
      <div className="space-y-4 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{record.owner_name} — {record.khasra_number}</h3>
          <p className="text-sm text-slate-500">{record.record_id} · {record.village}, {record.district}</p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={record.averageConfidence} />
          {record.validation && <ValidationStatusBadge status={record.validation.validation_status} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 min-h-[600px]">
        <div className="h-[600px] lg:h-auto lg:min-h-[700px]">
          <DocumentViewer
            pages={document.pages}
            regions={regions}
            highlightedField={highlightedField}
            fileType={document.fileType}
          />
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[700px]">
          <LowConfidenceSummary fields={record.fields} />

          {Object.entries(FIELD_SECTIONS).map(([section, fields]) => (
            <FieldCard
              key={section}
              title={section}
              fields={fields}
              recordFields={record.fields}
              editable
              editedValues={editedFields}
              onFieldChange={(key, value) =>
                setEditedFields((prev) => ({ ...prev, [key]: value }))
              }
              onFieldFocus={setHighlightedField}
              highlightedField={highlightedField}
            />
          ))}

          <Card title="Comments">
            <Input
              placeholder="Add verification comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Card>

          <div className="flex flex-wrap gap-3 sticky bottom-0 bg-slate-50 py-4 border-t border-slate-200">
            <Button variant="outline" loading={actionLoading} onClick={() => handleAction("save_draft")}>
              Save Draft
            </Button>
            <Button loading={actionLoading} onClick={() => setPendingAction("approve")}>
              Approve Record
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={() => setPendingAction("reject")}>
              Reject
            </Button>
            <Button variant="secondary" loading={actionLoading} onClick={() => setPendingAction("send_back")}>
              Send Back
            </Button>
          </div>
        </div>
      </div>

      {pendingAction && (
        <ConfirmDialog
          open={!!pendingAction}
          title={confirmMessages[pendingAction].title}
          message={confirmMessages[pendingAction].message}
          confirmLabel={pendingAction === "approve" ? "Approve" : pendingAction === "reject" ? "Reject" : "Send Back"}
          variant={confirmMessages[pendingAction].variant}
          loading={actionLoading}
          onConfirm={() => handleAction(pendingAction)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </AppLayout>
  );
}

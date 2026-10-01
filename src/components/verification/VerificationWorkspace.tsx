"use client";

import { useMemo, useState } from "react";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { VerificationHistory } from "@/components/verification/VerificationHistory";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn, getConfidenceLevel, getFieldLabel } from "@/lib/utils";
import type { AuditEvent, Document, LandRecord, OCRRegion, VerificationTask } from "@/types";
import { Check, AlertTriangle, Pencil } from "lucide-react";

const PRIMARY_FIELDS = ["owner_name", "khasra_number", "area", "village"] as const;

type PendingAction = "approve" | "reject" | null;

export function VerificationWorkspace({
  task,
  record,
  document,
  auditEvents,
  editedFields,
  onFieldChange,
  onCommentChange,
  comment,
  onAction,
  actionLoading,
}: {
  task: VerificationTask;
  record: LandRecord;
  document: Document;
  auditEvents: AuditEvent[];
  editedFields: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  onAction: (action: string) => void;
  actionLoading: boolean;
}) {
  const [focusedField, setFocusedField] = useState<string>();
  const [editMode, setEditMode] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const regionsByField = useMemo(() => {
    const map = new Map<string, { region: OCRRegion; pageIndex: number }>();
    record.ocr?.pages.forEach((p, pageIndex) => {
      p.regions.forEach((r) => {
        if (r.fieldKey) map.set(r.fieldKey, { region: r, pageIndex });
      });
    });
    return map;
  }, [record.ocr]);

  const focusMeta = focusedField ? regionsByField.get(focusedField) : undefined;
  const pageIndex = focusMeta?.pageIndex;

  const handleFocus = (key: string) => {
    setFocusedField(key);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 min-h-[640px]">
      <div className="flex flex-col min-h-[520px] lg:min-h-[720px]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gov-text-muted)] mb-2">
          Original scan
        </p>
        <div className="flex-1 min-h-[480px]">
          <DocumentViewer
            pages={document.pages}
            regions={
              pageIndex !== undefined
                ? record.ocr?.pages[pageIndex]?.regions || []
                : record.ocr?.pages.flatMap((p) => p.regions) || []
            }
            highlightedField={focusedField}
            fileType={document.fileType}
            pageIndex={pageIndex}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="gov-card overflow-hidden">
          <div className="gov-card-header border-b border-[var(--gov-border-light)]">
            <h3 className="text-base font-bold text-[var(--gov-navy)]">Land record verification</h3>
            <p className="text-xs text-[var(--gov-text-muted)] mt-0.5">
              {record.record_id} · {task.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="p-4 space-y-4">
            {PRIMARY_FIELDS.map((key) => {
              const field = record.fields[key];
              if (!field) return null;
              const level = getConfidenceLevel(field.confidence);
              const value = editedFields[key] ?? field.value;
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    focusedField === key ? "border-[var(--gov-saffron)] ring-2 ring-[var(--gov-saffron)]/30 bg-amber-50/40" : "border-[var(--gov-border-light)]",
                    level === "low" && "bg-amber-50/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">
                      {getFieldLabel(key)}
                    </label>
                    {level === "low" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Check className="h-4 w-4 text-[var(--gov-green)]" />
                    )}
                  </div>
                  {editMode ? (
                    <Input
                      value={value}
                      onChange={(e) => onFieldChange(key, e.target.value)}
                      onFocus={() => handleFocus(key)}
                      className={level === "low" ? "border-amber-400" : undefined}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left w-full text-sm font-semibold text-[var(--gov-navy)]"
                      onClick={() => handleFocus(key)}
                    >
                      {value}
                      {field.unit ? <span className="text-[var(--gov-text-muted)] ml-1">{field.unit}</span> : null}
                    </button>
                  )}
                </div>
              );
            })}

            {focusedField && focusMeta && (
              <div className="rounded-lg bg-[var(--gov-bg-subtle)] border border-[var(--gov-border-light)] p-3 text-xs">
                <p className="font-semibold text-[var(--gov-navy)] mb-2">Source</p>
                <p className="text-[var(--gov-text-muted)]">
                  Page {focusMeta.pageIndex + 1}
                </p>
                <p className="text-[var(--gov-text-muted)] mt-1">
                  Bounding box: [{focusMeta.region.bbox.join(", ")}]
                </p>
                <p className="text-[var(--gov-text-muted)] mt-2 italic">
                  Highlighted on the scan — verify extraction against the source region.
                </p>
              </div>
            )}

            <Input
              placeholder="Verification comment (optional)"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button loading={actionLoading} onClick={() => setPendingAction("approve")}>
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (editMode) onAction("save_draft");
                  else setEditMode(true);
                }}
                loading={actionLoading}
              >
                <Pencil className="h-4 w-4" /> {editMode ? "Save edits" : "Edit"}
              </Button>
              <Button variant="danger" loading={actionLoading} onClick={() => setPendingAction("reject")}>
                Reject
              </Button>
            </div>
          </div>
        </div>

        <VerificationHistory events={auditEvents} record={record} focusedField={focusedField} />
      </div>

      {pendingAction && (
        <ConfirmDialog
          open={!!pendingAction}
          title={pendingAction === "approve" ? "Approve record" : "Reject record"}
          message={
            pendingAction === "approve"
              ? `Approve ${record.record_id} for ${record.owner_name}? GIS and certification will be updated.`
              : `Reject ${record.record_id}? This marks the record as rejected.`
          }
          confirmLabel={pendingAction === "approve" ? "Approve" : "Reject"}
          variant={pendingAction === "reject" ? "danger" : "primary"}
          loading={actionLoading}
          onConfirm={() => {
            onAction(pendingAction);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}

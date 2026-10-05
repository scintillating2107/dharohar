"use client";

import { useMemo, useState } from "react";
import { DocumentViewer, type ViewerBox } from "@/components/documents/DocumentViewer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, TextArea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ConfidenceBadge, FieldSourceBadge, ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { useLocale } from "@/contexts/LocaleContext";
import { cn, formatConfidence, getConfidenceLevel, getFieldLabel } from "@/lib/utils";
import { AREA_UNITS, FIELD_SECTIONS } from "@/lib/config";
import type { AuditEvent, Document, ExtractedFieldValue, LandRecord, Owner, VerificationTask } from "@/types";
import { AlertTriangle, Crosshair, Plus, Trash2, XCircle } from "lucide-react";

export type WorkspaceAction = "save_draft" | "approve" | "reject" | "send_back";

export interface WorkspaceSubmit {
  action: WorkspaceAction;
  fields: Record<string, string>;
  owners: Owner[];
  comment: string;
}

interface Props {
  task: VerificationTask;
  record: LandRecord;
  document: Document;
  auditEvents: AuditEvent[];
  aiFields: Record<string, ExtractedFieldValue> | null;
  reviewThreshold: number;
  makerChecker: boolean;
  currentUserId: string;
  busy: boolean;
  onSubmit: (submit: WorkspaceSubmit) => void;
}

const ALL_FIELDS = Object.values(FIELD_SECTIONS).flat();

function initialValues(record: LandRecord): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of ALL_FIELDS) values[key] = record.fields[key]?.value ?? "";
  values.area_unit = record.fields.area?.unit ?? record.area_unit ?? "hectare";
  return values;
}

export function VerificationWorkspace(props: Props) {
  const { record, document, task, reviewThreshold } = props;
  const { t, tx } = useLocale();
  const editable = record.status === "VERIFICATION_REQUIRED" && ["PENDING", "IN_REVIEW"].includes(task.status);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(record));
  const [owners, setOwners] = useState<Owner[]>(() => record.owners ?? []);
  const [comment, setComment] = useState("");
  const [focused, setFocused] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<WorkspaceAction | null>(null);

  const original = useMemo(() => initialValues(record), [record]);
  const changedFields = Object.keys(values).filter((k) => (values[k] ?? "") !== (original[k] ?? ""));
  const ownersChanged = JSON.stringify(owners) !== JSON.stringify(record.owners ?? []);
  const dirty = changedFields.length > 0 || ownersChanged;
  const errors = record.validation?.errors ?? [];
  const warnings = record.validation?.warnings ?? [];
  const blockedByMakerChecker = props.makerChecker && (dirty || task.lastEditedBy === props.currentUserId);
  const needsReviewCount = Object.values(record.fields).filter((f) => getConfidenceLevel(f.confidence, reviewThreshold) === "low").length;

  const boxes: ViewerBox[] = useMemo(
    () =>
      Object.entries(record.fields)
        .filter(([, f]) => f.location)
        .map(([key, f]) => ({ key, page: f.location!.page, bbox: f.location!.bbox, label: t(getFieldLabel(key)), confidence: f.confidence })),
    [record.fields, t]
  );

  const focus = (key: string) => {
    setFocused(key);
    const loc = record.fields[key]?.location;
    if (loc) setPage(loc.page);
  };

  const submit = (action: WorkspaceAction) => {
    props.onSubmit({ action, fields: values, owners, comment });
    setDialog(null);
  };

  const fieldIssues = (key: string) => [
    ...errors.filter((e) => e.field === key).map((e) => ({ message: e.message, error: true })),
    ...warnings.filter((w) => w.field === key).map((w) => ({ message: w.message, error: false })),
  ];
  const setOwner = (i: number, patch: Partial<Owner>) => setOwners((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="grid xl:grid-cols-2 gap-6">
      <div className="xl:sticky xl:top-[76px] self-start h-[60vh] xl:h-[calc(100vh-7rem)] min-h-[420px]">
        <DocumentViewer pages={document.pages} boxes={boxes} highlightKey={focused} page={page} onPageChange={setPage} />
      </div>

      <div className="space-y-4">
        <div className="gov-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-sm text-[var(--gov-navy)]">
                {record.record_id} · v{record.version ?? 1}
              </p>
              <p className="text-xs text-[var(--gov-text-muted)] truncate">
                {document.name} · {t("Priority")}: {t(task.priority.charAt(0) + task.priority.slice(1).toLowerCase())}
              </p>
            </div>
            {editable && (
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge confidence={record.averageConfidence} reviewThreshold={reviewThreshold} />
                {record.validation && <ValidationStatusBadge status={record.validation.validation_status} />}
              </div>
            )}
          </div>
          {editable && needsReviewCount > 0 && (
            <p className="mt-3 text-sm text-amber-800">{t("{n} field(s) are below the review threshold and are highlighted below.", { n: needsReviewCount })}</p>
          )}
          {!editable && (
            <p className="mt-3 text-sm rounded bg-[var(--gov-bg-subtle)] p-2 text-[var(--gov-text-muted)]">{t("This record can no longer be edited here.")}</p>
          )}
        </div>

        {(errors.length > 0 || warnings.length > 0) && (
          <div className="gov-card p-4">
            <p className="text-sm font-semibold text-[var(--gov-navy)] mb-2">
              {t("Validation: {errors} error(s), {warnings} warning(s) · score {score}", {
                errors: errors.length,
                warnings: warnings.length,
                score: record.validation?.validation_score ?? 0,
              })}
            </p>
            <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
              {errors.map((e, i) => (
                <li key={`e${i}`}>
                  <button type="button" onClick={() => focus(e.field)} className="flex gap-2 text-left text-red-700 hover:underline">
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" /> {tx(e.message)}
                  </button>
                </li>
              ))}
              {warnings.map((w, i) => (
                <li key={`w${i}`} className="flex gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <button type="button" onClick={() => focus(w.field)} className="text-left hover:underline">
                      {tx(w.message)}
                    </button>
                    {w.related_record_id && (
                      <a href={`/records/${w.related_record_id}`} target="_blank" rel="noreferrer" className="ml-1 text-[var(--gov-navy-light)] underline">
                        {w.related_record_id}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.entries(FIELD_SECTIONS).map(([section, keys]) => (
          <div key={section} className="gov-card overflow-hidden">
            <div className="gov-card-header">
              <h3 className="text-sm font-bold text-[var(--gov-navy)]">{t(section)}</h3>
            </div>
            <div className="p-4 space-y-3">
              {keys.map((key) => {
                const field = record.fields[key];
                const level = field ? getConfidenceLevel(field.confidence, reviewThreshold) : null;
                const issues = fieldIssues(key);
                const changed = changedFields.includes(key) || (key === "area" && changedFields.includes("area_unit"));
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      focused === key ? "border-[var(--gov-saffron)] ring-2 ring-[var(--gov-saffron)]/30" : "border-[var(--gov-border-light)]",
                      level === "low" && "bg-amber-50/60",
                      changed && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label htmlFor={`f-${key}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">
                        {t(getFieldLabel(key))}
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {changed && <Badge variant="info">{t("Edited")}</Badge>}
                        {field && <FieldSourceBadge source={field.source} />}
                        {field && <ConfidenceBadge confidence={field.confidence} reviewThreshold={reviewThreshold} />}
                        {field?.location && (
                          <button
                            type="button"
                            onClick={() => focus(key)}
                            className="text-[var(--gov-navy-light)] p-1 rounded hover:bg-[var(--gov-bg)]"
                            title={t("Show on scan")}
                            aria-label={t("Show on scan")}
                          >
                            <Crosshair className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id={`f-${key}`}
                        value={values[key] ?? ""}
                        disabled={!editable}
                        onFocus={() => focus(key)}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                        placeholder={field ? "" : t("Not found — enter if present on the document")}
                      />
                      {key === "area" && (
                        <Select
                          className="max-w-[140px]"
                          value={values.area_unit}
                          disabled={!editable}
                          onChange={(e) => setValues((v) => ({ ...v, area_unit: e.target.value }))}
                          aria-label={t("Area unit")}
                        >
                          {[...new Set([values.area_unit, ...AREA_UNITS])].filter(Boolean).map((u) => (
                            <option key={u} value={u}>
                              {t(u)}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                    {(field?.note || field?.aiValue !== undefined || field?.modelConfidence !== undefined || issues.length > 0) && (
                      <div className="mt-1.5 space-y-0.5 text-xs text-[var(--gov-text-muted)]">
                        {field?.source === "officer" && field.aiValue !== undefined && <p>{t("AI read: “{value}”", { value: field.aiValue })}</p>}
                        {field?.modelConfidence !== undefined && (
                          <p>
                            {t("Model {model}", { model: formatConfidence(field.modelConfidence) })}
                            {" · "}
                            {field.ocrConfidence !== undefined ? t("OCR {ocr}", { ocr: formatConfidence(field.ocrConfidence) }) : t("not located in OCR words")}
                          </p>
                        )}
                        {field?.note && <p className="text-amber-800">{tx(field.note)}</p>}
                        {issues.map((iss, i) => (
                          <p key={i} className={iss.error ? "text-red-700" : "text-amber-800"}>
                            {tx(iss.message)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="gov-card overflow-hidden">
          <div className="gov-card-header flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--gov-navy)]">{t("Owners ({n})", { n: owners.length })}</h3>
            {editable && (
              <Button size="sm" variant="outline" onClick={() => setOwners((o) => [...o, { name: "" }])}>
                <Plus className="h-3.5 w-3.5" /> {t("Add owner")}
              </Button>
            )}
          </div>
          <div className="p-4 space-y-3">
            {owners.length === 0 && <p className="text-sm text-[var(--gov-text-muted)]">{t("No owners extracted.")}</p>}
            {owners.map((o, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center rounded-md sm:rounded-none border sm:border-0 border-[var(--gov-border-light)] p-2 sm:p-0">
                <Input
                  className="col-span-2 sm:col-span-4"
                  value={o.name}
                  disabled={!editable}
                  placeholder={t("Owner name")}
                  aria-label={t("Owner name")}
                  onChange={(e) => setOwner(i, { name: e.target.value })}
                />
                <Select className="sm:col-span-2" value={o.relation_type ?? ""} disabled={!editable} aria-label={t("Relation")} onChange={(e) => setOwner(i, { relation_type: e.target.value || undefined })}>
                  <option value="">—</option>
                  <option value="S/O">{t("S/O")}</option>
                  <option value="D/O">{t("D/O")}</option>
                  <option value="W/O">{t("W/O")}</option>
                  <option value="C/O">{t("C/O")}</option>
                </Select>
                <Input
                  className="sm:col-span-3"
                  value={o.relation_name ?? ""}
                  disabled={!editable}
                  placeholder={t("Father / husband")}
                  aria-label={t("Father / husband")}
                  onChange={(e) => setOwner(i, { relation_name: e.target.value || undefined })}
                />
                <Input
                  className="sm:col-span-2"
                  inputMode="decimal"
                  value={o.share ?? ""}
                  disabled={!editable}
                  placeholder={t("Share")}
                  aria-label={t("Share")}
                  title={t("Share as a fraction (0.5) or percent (50)")}
                  onChange={(e) => setOwner(i, { share: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
                {editable && (
                  <button
                    type="button"
                    className="sm:col-span-1 justify-self-end sm:justify-self-center text-red-600 p-1.5 rounded hover:bg-red-50"
                    onClick={() => setOwners((list) => list.filter((_, j) => j !== i))}
                    aria-label={t("Remove owner")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {editable && (
          <div className="gov-card p-4 space-y-3 xl:sticky xl:bottom-2 shadow-lg">
            <TextArea
              placeholder={t("Comment (required to reject or send back)")}
              aria-label={t("Comment")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
            />
            {dirty && <p className="text-xs text-[var(--gov-navy-light)]">{t("{n} unsaved change(s)", { n: changedFields.length + (ownersChanged ? 1 : 0) })}</p>}
            {props.makerChecker && (
              <p className="text-xs text-amber-800">
                {t("Maker-checker is on: an officer who edits this record cannot also approve it.")}
                {task.lastEditedBy === props.currentUserId && !dirty ? ` ${t("You edited this record, so another officer must approve it.")}` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDialog("approve")} loading={props.busy} disabled={blockedByMakerChecker || (errors.length > 0 && !dirty)}>
                {t("Approve & certify")}
              </Button>
              <Button variant="outline" onClick={() => submit("save_draft")} loading={props.busy} disabled={!dirty && !comment}>
                {t("Save draft")}
              </Button>
              <Button variant="outline" onClick={() => setDialog("send_back")} loading={props.busy}>
                {t("Send back")}
              </Button>
              <Button variant="danger" onClick={() => setDialog("reject")} loading={props.busy}>
                {t("Reject")}
              </Button>
            </div>
            {errors.length > 0 && !dirty && <p className="text-xs text-red-700">{t("Fix the errors above before approving.")}</p>}
          </div>
        )}

        <div className="gov-card overflow-hidden">
          <div className="gov-card-header">
            <h3 className="text-sm font-bold text-[var(--gov-navy)]">{t("History")}</h3>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            <AuditTimeline events={props.auditEvents} />
          </div>
        </div>
      </div>

      <Modal
        open={dialog === "approve"}
        title="Approve and certify record"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => submit("approve")} loading={props.busy}>
              {t("Approve")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--gov-text-muted)]">
          {t("{id} will be marked verified, digitally signed and published to integrated systems.", { id: record.record_id })}
          {dirty ? ` ${t("Your changes will be saved with it.")}` : ""}
        </p>
        {warnings.length > 0 && (
          <p className="text-sm text-amber-800 mt-2">
            <Badge variant="warning">{t("{n} warning(s)", { n: warnings.length })}</Badge> {t("Make sure each one has been checked against the source document.")}
          </p>
        )}
      </Modal>
      <Modal
        open={dialog === "reject" || dialog === "send_back"}
        title={dialog === "reject" ? "Reject record" : "Send back for reprocessing"}
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("Cancel")}
            </Button>
            <Button variant={dialog === "reject" ? "danger" : "primary"} disabled={!comment.trim()} loading={props.busy} onClick={() => dialog && submit(dialog)}>
              {dialog === "reject" ? t("Reject") : t("Send back")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--gov-text-muted)] mb-3">
          {dialog === "reject"
            ? t("Rejected records are kept for audit but excluded from the verified inventory.")
            : t("The document will be re-run through enhancement, OCR and extraction; the same record gets a new version.")}
        </p>
        <TextArea placeholder={t("Reason (required)")} aria-label={t("Reason")} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
      </Modal>
    </div>
  );
}

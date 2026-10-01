"use client";

import type { AuditEvent, LandRecord } from "@/types";
import { getFieldLabel } from "@/lib/utils";

const ACTION_TEXT: Record<string, (e: AuditEvent) => string> = {
  FIELD_EDITED: (e) =>
    `Officer changed ${e.field ? getFieldLabel(e.field) : "field"} to ${e.newValue ?? ""}`,
  RECORD_APPROVED: () => "Record approved",
  RECORD_REJECTED: () => "Record rejected",
  DRAFT_SAVED: () => "Draft saved",
  VERIFICATION_STARTED: () => "Officer opened verification",
  OCR_COMPLETED: (e) => `OCR completed${e.details ? ` — ${e.details}` : ""}`,
  EXTRACTION_COMPLETED: () => "Fields extracted",
  VALIDATION_COMPLETED: (e) => `Validation completed${e.details ? ` — ${e.details}` : ""}`,
  DOCUMENT_UPLOADED: () => "Document uploaded",
  PROCESSING_COMPLETED: (e) => e.details || "Processing step completed",
  CERTIFICATE_GENERATED: () => "Blockchain certificate generated",
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function VerificationHistory({
  events,
  record,
  focusedField,
}: {
  events: AuditEvent[];
  record: LandRecord;
  focusedField?: string;
}) {
  const fromAudit = [...events]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((e) => ({
      time: formatTime(e.timestamp),
      text: ACTION_TEXT[e.action]?.(e) || `${e.action}${e.details ? `: ${e.details}` : ""}`,
    }));

  const extras: { time: string; text: string }[] = [];
  if (fromAudit.length === 0 && record.fields.area) {
    const area = record.fields.area;
    extras.push({
      time: "—",
      text: `AI extracted Area = ${area.value}${area.unit ? ` ${area.unit}` : ""}`,
    });
  }
  if (focusedField && fromAudit.length === 0) {
    extras.push({ time: "—", text: `Officer opened field (${getFieldLabel(focusedField)})` });
  }

  const timeline = fromAudit.length > 0 ? fromAudit : extras;

  return (
    <div className="gov-card overflow-hidden">
      <div className="gov-card-header">
        <h4 className="text-sm font-semibold text-[var(--gov-navy)]">Verification history</h4>
      </div>
      <ul className="p-4 space-y-3 max-h-64 overflow-y-auto text-sm">
        {timeline.length === 0 ? (
          <li className="text-[var(--gov-text-muted)]">No verification events yet.</li>
        ) : (
          timeline.map((item, i) => (
            <li key={`${item.time}-${i}`} className="flex gap-3">
              <span className="font-mono text-xs text-[var(--gov-text-muted)] w-10 flex-shrink-0">{item.time}</span>
              <span className="text-[var(--gov-navy)]">{item.text}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

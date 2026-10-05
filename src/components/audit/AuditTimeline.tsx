"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import type { AuditActionType, AuditEvent } from "@/types";
import { formatDate, getFieldLabel } from "@/lib/utils";

export const AUDIT_LABELS: Record<AuditActionType, string> = {
  DOCUMENT_UPLOADED: "Document uploaded",
  PROCESSING_QUEUED: "Processing queued",
  PROCESSING_STARTED: "Processing started",
  PROCESSING_COMPLETED: "Processing completed",
  PROCESSING_FAILED: "Processing failed",
  OCR_COMPLETED: "OCR completed",
  EXTRACTION_COMPLETED: "Fields extracted",
  VALIDATION_COMPLETED: "Validation completed",
  VERIFICATION_STARTED: "Verification started",
  FIELD_EDITED: "Field edited",
  OWNERS_EDITED: "Owners edited",
  RECORD_APPROVED: "Record approved",
  RECORD_AUTO_APPROVED: "Record auto-approved",
  RECORD_REJECTED: "Record rejected",
  RECORD_SENT_BACK: "Sent back for reprocessing",
  RECORD_PERSISTED: "Record version stored",
  DRAFT_SAVED: "Draft saved",
  CERTIFICATE_GENERATED: "Certificate signed",
  PARCEL_GEOMETRY_UPDATED: "Parcel boundary updated",
  USER_LOGIN: "Signed in",
  USER_LOGIN_FAILED: "Sign-in failures / lockout",
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  PASSWORD_CHANGED: "Password changed",
  SETTINGS_UPDATED: "Settings changed",
  API_KEY_CREATED: "API key created",
  API_KEY_REVOKED: "API key revoked",
  WEBHOOK_CREATED: "Webhook registered",
  CLAIM_SUBMITTED: "Ownership claim submitted",
  CLAIM_REVIEWED: "Ownership claim reviewed",
  MASTER_DATA_IMPORTED: "Master data imported",
};

export function AuditTimeline({ events, variant = "compact" }: { events: AuditEvent[]; variant?: "compact" | "full" }) {
  const { t, tx } = useLocale();
  if (events.length === 0) {
    return <p className="text-sm text-[var(--gov-text-muted)] py-8 text-center">{t("No audit events found.")}</p>;
  }

  return (
    <ol>
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`rounded-full mt-2 ${variant === "full" ? "h-3 w-3" : "h-2.5 w-2.5"} ${
                event.action.includes("FAIL") || event.action === "RECORD_REJECTED" ? "bg-red-600" : event.action.includes("APPROVED") || event.action === "CERTIFICATE_GENERATED" ? "bg-[var(--gov-green)]" : "bg-[var(--gov-navy)]"
              }`}
            />
            {index < events.length - 1 && <div className="w-0.5 flex-1 bg-[var(--gov-border-light)] min-h-[32px]" />}
          </div>
          <div className="pb-5 flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-[var(--gov-navy)]">{t(AUDIT_LABELS[event.action] ?? event.action)}</span>
              <span className="text-xs text-[var(--gov-text-muted)]">{t("by {name}", { name: event.actorName })}</span>
            </div>
            {event.details && <p className="text-sm text-[var(--gov-text-muted)] mt-0.5 break-words">{tx(event.details)}</p>}
            {event.field && (
              <div className="mt-1.5 rounded-md bg-[var(--gov-bg-subtle)] border border-[var(--gov-border-light)] p-2 text-xs">
                <span className="font-medium">{t(getFieldLabel(event.field))}:</span>{" "}
                <span className="text-red-700 line-through">{event.oldValue || "∅"}</span> →{" "}
                <span className="text-[var(--gov-green)] font-medium">{event.newValue || "∅"}</span>
              </div>
            )}
            <p className="text-xs text-[var(--gov-text-light)] mt-1">
              {formatDate(event.timestamp)}
              {variant === "full" && (event.recordId || event.documentId) && (
                <>
                  {" · "}
                  {event.recordId ? (
                    <Link href={`/records/${event.recordId}`} className="font-mono text-[var(--gov-navy-light)]">{event.recordId}</Link>
                  ) : (
                    <Link href={`/documents/${event.documentId}`} className="font-mono text-[var(--gov-navy-light)]">{event.documentId}</Link>
                  )}
                </>
              )}
              {variant === "full" && event.hash && <span className="font-mono"> · #{event.seq} {event.hash.slice(0, 12)}…</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

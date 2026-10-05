"use client";

import type { AuditEvent } from "@/types";
import { AuditTimeline } from "@/components/audit/AuditTimeline";

/** Verification-related audit events for a record (kept as a thin wrapper for reuse). */
export function VerificationHistory({ events }: { events: AuditEvent[] }) {
  const relevant = events.filter((e) =>
    ["FIELD_EDITED", "OWNERS_EDITED", "DRAFT_SAVED", "RECORD_APPROVED", "RECORD_AUTO_APPROVED", "RECORD_REJECTED", "RECORD_SENT_BACK", "CERTIFICATE_GENERATED"].includes(e.action)
  );
  return (
    <div className="gov-card overflow-hidden">
      <div className="gov-card-header">
        <h4 className="text-sm font-semibold text-[var(--gov-navy)]">Verification history</h4>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        <AuditTimeline events={relevant} />
      </div>
    </div>
  );
}

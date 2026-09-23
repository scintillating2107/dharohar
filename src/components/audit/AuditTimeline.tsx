import type { AuditEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { getFieldLabel } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  DOCUMENT_UPLOADED: "Document uploaded",
  PROCESSING_STARTED: "Processing started",
  PROCESSING_COMPLETED: "Processing completed",
  OCR_COMPLETED: "OCR completed",
  EXTRACTION_COMPLETED: "Extraction completed",
  VALIDATION_COMPLETED: "Validation completed",
  VERIFICATION_STARTED: "Verification started",
  FIELD_EDITED: "Field edited",
  RECORD_APPROVED: "Record approved",
  RECORD_REJECTED: "Record rejected",
  RECORD_SENT_BACK: "Record sent back",
  DRAFT_SAVED: "Draft saved",
};

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">No audit events found.</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-400 mt-2" />
            {index < events.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-200 min-h-[40px]" />
            )}
          </div>
          <div className="pb-6 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono text-slate-500">
                {new Date(event.timestamp).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {event.actorName}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              {ACTION_LABELS[event.action] || event.action}
              {event.details && ` — ${event.details}`}
            </p>
            {event.field && event.oldValue !== undefined && (
              <div className="mt-2 rounded-md bg-slate-50 border border-slate-100 p-3 text-xs">
                <p className="font-medium text-slate-700">{getFieldLabel(event.field)}</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="text-slate-500">Old:</span>{" "}
                    <span className="text-red-600 line-through">{event.oldValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">New:</span>{" "}
                    <span className="text-green-700 font-medium">{event.newValue}</span>
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">{formatDate(event.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

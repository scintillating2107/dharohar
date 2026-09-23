import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store, generateId } from "@/lib/store";
import { persistRecord, persistParcel } from "@/lib/integrations/database";
import { retryProcessingFromStep } from "@/lib/processing-pipeline";
import { apiSuccess, unauthorized, notFound, apiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const task = store.verificationTasks.find((t) => t.id === id || t.recordId === id);
  if (!task) return notFound("Verification task not found");

  const record = store.getRecord(task.recordId);
  const document = store.getDocument(task.documentId);
  const auditEvents = store.auditEvents.filter(
    (e) => e.recordId === task.recordId || e.documentId === task.documentId
  );

  return apiSuccess({ task, record, document, auditEvents });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const task = store.verificationTasks.find((t) => t.id === id || t.recordId === id);
  if (!task) return notFound("Verification task not found");

  const body = await request.json();
  const { action, fields, comment } = body;
  const user = store.users.find((u) => u.id === session.userId);
  const now = new Date().toISOString();

  const record = store.getRecord(task.recordId);
  if (!record) return notFound("Record not found");

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      const oldValue = record.fields[key]?.value;
      if (oldValue !== value) {
        store.addAuditEvent({
          id: generateId("AE"),
          documentId: task.documentId,
          recordId: task.recordId,
          timestamp: now,
          actor: session.userId,
          actorName: user?.name || "Unknown",
          action: "FIELD_EDITED",
          field: key,
          oldValue,
          newValue: value as string,
        });

        record.fields[key] = {
          ...record.fields[key],
          value: value as string,
          confidence: 1.0,
        };
      }
    }

    record.owner_name = record.fields.owner_name?.value || record.owner_name;
    record.khasra_number = record.fields.khasra_number?.value || record.khasra_number;
    record.updatedAt = now;
    store.updateRecord(task.recordId, record);
  }

  switch (action) {
    case "save_draft":
      store.updateVerificationTask(task.id, { status: "IN_REVIEW", updatedAt: now });
      store.addAuditEvent({
        id: generateId("AE"),
        documentId: task.documentId,
        recordId: task.recordId,
        timestamp: now,
        actor: session.userId,
        actorName: user?.name || "Unknown",
        action: "DRAFT_SAVED",
      });
      break;

    case "approve":
      store.updateVerificationTask(task.id, { status: "APPROVED", updatedAt: now });
      store.updateRecord(task.recordId, {
        status: "VERIFIED",
        verifiedAt: now,
        verifiedBy: user?.name,
      });
      store.updateDocument(task.documentId, { status: "VERIFIED" });

      const doc = store.getDocument(task.documentId);
      if (doc) {
        const steps = doc.steps.map((s) =>
          s.key === "human_verification" || s.key === "final_storage"
            ? { ...s, status: "completed" as const, completedAt: now }
            : s
        );
        store.updateDocument(task.documentId, { steps, status: "VERIFIED" });
      }

      const parcel = store.getParcelByRecord(task.recordId);
      if (parcel) {
        store.updateParcelByRecord(task.recordId, { status: "VERIFIED" });
      }

      const approvedRecord = store.getRecord(task.recordId);
      if (approvedRecord) {
        await persistRecord(approvedRecord).catch(console.error);
        const updatedParcel = store.getParcelByRecord(task.recordId);
        if (updatedParcel) {
          await persistParcel(updatedParcel).catch(console.error);
        }

        const finalSteps = store.getDocument(task.documentId)?.steps || [];
        const completedSteps = finalSteps.map((s) =>
          s.key === "final_storage"
            ? { ...s, status: "completed" as const, completedAt: now }
            : s
        );
        store.updateDocument(task.documentId, { steps: completedSteps });

        store.addAuditEvent({
          id: generateId("AE"),
          documentId: task.documentId,
          recordId: task.recordId,
          timestamp: now,
          actor: session.userId,
          actorName: user?.name || "Unknown",
          action: "RECORD_PERSISTED",
          details: "Record and parcel persisted to database (Member 6 integration)",
        });
      }

      store.addAuditEvent({
        id: generateId("AE"),
        documentId: task.documentId,
        recordId: task.recordId,
        timestamp: now,
        actor: session.userId,
        actorName: user?.name || "Unknown",
        action: "RECORD_APPROVED",
        details: comment,
      });
      break;

    case "reject":
      store.updateVerificationTask(task.id, { status: "REJECTED", updatedAt: now, comments: comment });
      store.updateRecord(task.recordId, { status: "REJECTED" });
      store.updateDocument(task.documentId, { status: "REJECTED" });
      store.addAuditEvent({
        id: generateId("AE"),
        documentId: task.documentId,
        recordId: task.recordId,
        timestamp: now,
        actor: session.userId,
        actorName: user?.name || "Unknown",
        action: "RECORD_REJECTED",
        details: comment,
      });
      break;

    case "send_back":
      store.updateVerificationTask(task.id, { status: "SENT_BACK", updatedAt: now, comments: comment });
      store.updateDocument(task.documentId, { status: "UPLOADED" });
      store.addAuditEvent({
        id: generateId("AE"),
        documentId: task.documentId,
        recordId: task.recordId,
        timestamp: now,
        actor: session.userId,
        actorName: user?.name || "Unknown",
        action: "RECORD_SENT_BACK",
        details: comment,
      });
      retryProcessingFromStep(task.documentId).catch(console.error);
      break;

    default:
      return apiError("Invalid action");
  }

  return apiSuccess({ task, record: store.getRecord(task.recordId) });
}

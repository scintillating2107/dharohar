import { and, desc, eq, ne } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { documents, records, recordVersions, verificationTasks } from "@/server/db/schema";
import { appendAudit } from "@/server/audit";
import { newId } from "@/server/crypto";
import { canonicalizeLocation, loadMaster, type CanonicalLocation } from "@/server/master";
import { getSettings } from "@/server/settings";
import { issueCertificate, publicKeyInfo } from "@/server/certification";
import { recordCorrections } from "@/server/learning";
import { notifyUsers } from "@/server/notifications";
import { emitWebhookEvent } from "@/server/webhooks";
import { EXTRACTION_FIELDS } from "@/server/pipeline/gemini";
import { validateCandidate, type ExistingRecord } from "@/server/pipeline/validation";
import { normalizeAreaUnit, normalizeKhasra, parseIndianDate, toHectares } from "@/server/pipeline/normalize";
import { enqueueJob } from "@/server/jobs";
import { getDocumentRow, getRecordRow, snapshotOf, toRecord, type DocumentRow, type RecordRow } from "@/server/repo";
import type { ExtractedFieldValue, LandRecord, Owner, SystemSettings, ValidationResult } from "@/types";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export interface Actor {
  id: string;
  name: string;
}

export const SYSTEM_ACTOR: Actor = { id: "System", name: "System" };

// ---------------------------------------------------------------------------
// Record columns derived from fields
// ---------------------------------------------------------------------------

export function averageConfidence(fields: Record<string, ExtractedFieldValue>): number {
  const values = Object.values(fields).map((f) => f.confidence);
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000;
}

export function buildRecordColumns(
  fields: Record<string, ExtractedFieldValue>,
  owners: Owner[],
  canonical: CanonicalLocation,
  doc: Pick<DocumentRow, "recordYear">
) {
  const v = (k: string) => fields[k]?.value?.trim() || "";
  const areaValue = parseFloat(v("area"));
  const unit = normalizeAreaUnit(fields.area?.unit ?? "hectare") ?? fields.area?.unit ?? "hectare";
  const area = Number.isFinite(areaValue) ? areaValue : 0;
  const recordYear = doc.recordYear ? parseInt(doc.recordYear, 10) : NaN;
  return {
    ownerName: v("owner_name") || owners[0]?.name || "",
    fatherName: v("father_name") || owners[0]?.relation_name || null,
    owners,
    khasraNumber: v("khasra_number"),
    khasraNormalized: v("khasra_number") ? normalizeKhasra(v("khasra_number")) : "",
    khataNumber: v("khata_number"),
    surveyNumber: v("survey_number") || null,
    landType: v("land_type") || null,
    area,
    areaUnit: unit,
    areaHectares: area > 0 ? toHectares(area, unit, canonical.state) : null,
    village: canonical.village || v("village"),
    tehsil: canonical.tehsil || v("tehsil"),
    district: canonical.district || v("district"),
    state: canonical.state || v("state"),
    registrationNumber: v("registration_number") || null,
    mutationNumber: v("mutation_number") || null,
    mutationDate: v("mutation_date") ? parseIndianDate(v("mutation_date")) ?? v("mutation_date") : null,
    recordYear: Number.isFinite(recordYear) ? recordYear : null,
    averageConfidence: averageConfidence(fields),
  };
}

/** Runs all validation checks against live data. Must be called outside a transaction. */
export async function computeValidation(input: {
  documentId: string;
  fields: Record<string, ExtractedFieldValue>;
  owners: Owner[];
  doc: DocumentRow;
  settings?: SystemSettings;
}): Promise<{ validation: ValidationResult; canonical: CanonicalLocation }> {
  const db = await getDb();
  const master = await loadMaster();
  const settings = input.settings ?? (await getSettings());
  const f = input.fields;
  const canonical = canonicalizeLocation(master, {
    state: f.state?.value,
    district: f.district?.value,
    tehsil: f.tehsil?.value,
    village: f.village?.value,
  });
  const khasra = f.khasra_number?.value ? normalizeKhasra(f.khasra_number.value) : "";
  const sameKhasra: ExistingRecord[] = khasra
    ? (
        await db
          .select()
          .from(records)
          .where(and(eq(records.khasraNormalized, khasra), ne(records.documentId, input.documentId)))
      ).map((r) => ({
        id: r.id,
        documentId: r.documentId,
        status: r.status,
        ownerName: r.ownerName,
        khasraNormalized: r.khasraNormalized,
        khataNumber: r.khataNumber,
        village: r.village,
        district: r.district,
        areaHectares: r.areaHectares,
        area: r.area,
        areaUnit: r.areaUnit,
        mutationNumber: r.mutationNumber,
        verifiedAt: r.verifiedAt,
      }))
    : [];
  const [dupDoc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.sha256, input.doc.sha256), ne(documents.id, input.documentId)))
    .limit(1);

  const validation = validateCandidate({
    documentId: input.documentId,
    duplicateDocumentId: dupDoc?.id ?? null,
    fields: input.fields,
    owners: input.owners,
    canonical,
    recordYear: input.doc.recordYear ? parseInt(input.doc.recordYear, 10) : null,
    sameKhasraRecords: sameKhasra,
    master,
    settings,
  });
  return { validation, canonical };
}

export async function writeVersion(tx: DB, record: RecordRow, reason: string, actor: Actor): Promise<void> {
  await tx.insert(recordVersions).values({
    id: newId("RV"),
    recordId: record.id,
    version: record.version,
    reason,
    snapshot: snapshotOf(toRecord(record)),
    createdBy: actor.id,
    createdByName: actor.name,
  });
}

// ---------------------------------------------------------------------------
// Officer edits
// ---------------------------------------------------------------------------

const EDITABLE = new Set<string>(EXTRACTION_FIELDS);

function applyFieldEdits(
  current: Record<string, ExtractedFieldValue>,
  edits: Record<string, string> | undefined
): { fields: Record<string, ExtractedFieldValue>; changes: { field: string; oldValue?: string; newValue: string }[] } {
  const fields = { ...current };
  const changes: { field: string; oldValue?: string; newValue: string }[] = [];
  for (const [key, raw] of Object.entries(edits ?? {})) {
    if (!EDITABLE.has(key) && key !== "area_unit") continue;
    const newValue = String(raw ?? "").trim();
    if (key === "area_unit") {
      if (fields.area && (fields.area.unit ?? "") !== newValue) {
        changes.push({ field: "area_unit", oldValue: fields.area.unit, newValue });
        fields.area = {
          ...fields.area,
          unit: newValue,
          aiValue: fields.area.aiValue ?? fields.area.value,
          source: "officer",
          confidence: 1,
          needsReview: false,
        };
      }
      continue;
    }
    const old = fields[key];
    if ((old?.value ?? "") === newValue) continue;
    changes.push({ field: key, oldValue: old?.value, newValue });
    if (!newValue) {
      delete fields[key];
      continue;
    }
    fields[key] = {
      ...(old ?? {}),
      value: newValue,
      confidence: 1,
      source: "officer",
      aiValue: old ? old.aiValue ?? (old.source === "officer" ? undefined : old.value) : undefined,
      needsReview: false,
    } as ExtractedFieldValue;
  }
  return { fields, changes };
}

function sanitizeOwners(owners: Owner[] | undefined): Owner[] | undefined {
  if (!owners) return undefined;
  return owners
    .filter((o) => o && typeof o.name === "string" && o.name.trim())
    .slice(0, 50)
    .map((o) => ({
      name: o.name.trim(),
      ...(o.relation_name?.trim() ? { relation_name: o.relation_name.trim() } : {}),
      ...(o.relation_type ? { relation_type: String(o.relation_type) } : {}),
      ...(typeof o.share === "number" && Number.isFinite(o.share) ? { share: o.share } : {}),
    }));
}

async function loadEditable(recordId: string) {
  const record = await getRecordRow(recordId);
  if (!record) throw new ServiceError("Record not found", 404);
  const doc = await getDocumentRow(record.documentId);
  if (!doc) throw new ServiceError("Source document not found", 404);
  return { record, doc };
}

/** Applies officer edits, re-runs validation, and returns the prepared row values (no write). */
async function prepareEdits(
  record: RecordRow,
  doc: DocumentRow,
  edits: { fields?: Record<string, string>; owners?: Owner[] }
) {
  const { fields, changes } = applyFieldEdits(record.fields, edits.fields);
  const owners = sanitizeOwners(edits.owners) ?? record.owners;
  const ownersChanged = JSON.stringify(owners) !== JSON.stringify(record.owners);
  const { validation, canonical } = await computeValidation({ documentId: doc.id, fields, owners, doc });
  const columns = buildRecordColumns(fields, owners, canonical, doc);
  return { fields, owners, ownersChanged, changes, validation, columns };
}

async function auditEdits(
  tx: DB,
  record: RecordRow,
  actor: Actor,
  changes: { field: string; oldValue?: string; newValue: string }[],
  ownersChanged: boolean,
  owners: Owner[]
) {
  for (const c of changes) {
    await appendAudit(
      {
        action: "FIELD_EDITED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        field: c.field,
        oldValue: c.oldValue ?? "",
        newValue: c.newValue,
      },
      tx
    );
  }
  if (ownersChanged) {
    await appendAudit(
      {
        action: "OWNERS_EDITED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: owners.map((o) => `${o.name}${o.share != null ? ` (${o.share})` : ""}`).join("; "),
      },
      tx
    );
  }
}

export async function saveDraft(
  recordId: string,
  edits: { fields?: Record<string, string>; owners?: Owner[]; comment?: string },
  actor: Actor
): Promise<LandRecord> {
  const { record, doc } = await loadEditable(recordId);
  if (record.status !== "VERIFICATION_REQUIRED") throw new ServiceError("Only records awaiting verification can be edited");
  const prepared = await prepareEdits(record, doc, edits);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.transaction(async (t) => {
    const tx = t as unknown as DB;
    await tx
      .update(records)
      .set({ ...prepared.columns, fields: prepared.fields, validation: prepared.validation, updatedAt: now })
      .where(eq(records.id, record.id));
    await tx
      .update(verificationTasks)
      .set({
        status: "IN_REVIEW",
        updatedAt: now,
        validationStatus: prepared.validation.validation_status,
        confidence: prepared.columns.averageConfidence,
        ...(prepared.changes.length || prepared.ownersChanged ? { lastEditedBy: actor.id } : {}),
        ...(edits.comment ? { comments: edits.comment } : {}),
      })
      .where(eq(verificationTasks.recordId, record.id));
    await auditEdits(tx, record, actor, prepared.changes, prepared.ownersChanged, prepared.owners);
    await appendAudit(
      {
        action: "DRAFT_SAVED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: `${prepared.changes.length} field change(s); validation ${prepared.validation.validation_status} (${prepared.validation.validation_score})`,
      },
      tx
    );
  });
  return toRecord((await getRecordRow(record.id))!);
}

// ---------------------------------------------------------------------------
// Approve / reject / send back
// ---------------------------------------------------------------------------

export async function approveRecord(
  recordId: string,
  edits: { fields?: Record<string, string>; owners?: Owner[]; comment?: string },
  actor: Actor,
  opts: { auto?: boolean } = {}
): Promise<LandRecord> {
  const { record, doc } = await loadEditable(recordId);
  if (record.status !== "VERIFICATION_REQUIRED") throw new ServiceError("Record is not awaiting verification");
  const settings = await getSettings();
  const db = await getDb();
  const [task] = await db.select().from(verificationTasks).where(eq(verificationTasks.recordId, record.id));
  const prepared = await prepareEdits(record, doc, edits);
  const editsNow = prepared.changes.length > 0 || prepared.ownersChanged;

  if (!opts.auto && settings.makerChecker && (editsNow || task?.lastEditedBy === actor.id)) {
    throw new ServiceError(
      "Maker-checker is enabled: the officer who edited this record cannot approve it. Save your edits and ask another officer to approve.",
      403
    );
  }
  if (prepared.validation.errors.length > 0) {
    throw new ServiceError(
      `Cannot approve: ${prepared.validation.errors.map((e) => e.message).join("; ")}`,
      422
    );
  }

  // AI baseline for accuracy measurement: the latest machine-generated version
  const [aiVersion] = await db
    .select()
    .from(recordVersions)
    .where(and(eq(recordVersions.recordId, record.id), eq(recordVersions.createdBy, SYSTEM_ACTOR.id)))
    .orderBy(desc(recordVersions.version))
    .limit(1);
  const aiFields = (aiVersion?.snapshot.fields ?? record.fields) as Record<string, ExtractedFieldValue>;

  await publicKeyInfo(); // load signing key before entering the transaction
  const now = new Date().toISOString();
  let learning = { total: 0, corrected: 0 };

  await db.transaction(async (t) => {
    const tx = t as unknown as DB;
    const [updated] = await tx
      .update(records)
      .set({
        ...prepared.columns,
        fields: prepared.fields,
        validation: prepared.validation,
        status: "VERIFIED",
        version: record.version + 1,
        verifiedAt: now,
        verifiedBy: actor.name,
        updatedAt: now,
      })
      .where(eq(records.id, record.id))
      .returning();

    await auditEdits(tx, record, actor, prepared.changes, prepared.ownersChanged, prepared.owners);
    const approvedEvent = await appendAudit(
      {
        action: opts.auto ? "RECORD_AUTO_APPROVED" : "RECORD_APPROVED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: edits.comment || (opts.auto ? "Auto-approved: confidence and validation above thresholds" : undefined),
      },
      tx
    );

    const certificate = await issueCertificate({
      record: updated,
      documentSha256: doc.sha256,
      certifiedBy: actor.name,
      certifiedAt: now,
      auditHead: approvedEvent.hash ?? null,
    });
    const [certified] = await tx.update(records).set({ certificate }).where(eq(records.id, record.id)).returning();
    await writeVersion(tx, certified, opts.auto ? "Auto-approved" : `Approved by ${actor.name}`, actor);

    await appendAudit(
      {
        action: "CERTIFICATE_GENERATED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: `Record hash ${certificate.record_hash.slice(0, 16)}… signed (Ed25519, key ${certificate.key_id})`,
      },
      tx
    );

    learning = await recordCorrections(tx, {
      recordId: record.id,
      aiFields,
      finalFields: prepared.fields,
      district: certified.district,
      recordType: doc.recordType,
      language: doc.detectedLanguage,
      userId: actor.id,
    });

    await tx
      .update(verificationTasks)
      .set({ status: "APPROVED", updatedAt: now, comments: edits.comment ?? task?.comments ?? null })
      .where(eq(verificationTasks.recordId, record.id));

    const steps = doc.steps.map((s) =>
      s.key === "human_verification" || s.key === "final_storage"
        ? { ...s, status: "completed" as const, completedAt: now, detail: s.key === "final_storage" ? "Record certified and stored" : `Approved by ${actor.name}` }
        : s
    );
    await tx.update(documents).set({ status: "VERIFIED", steps }).where(eq(documents.id, doc.id));
    await appendAudit(
      {
        action: "RECORD_PERSISTED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: `Version ${certified.version} stored; ${learning.corrected}/${learning.total} AI fields corrected`,
      },
      tx
    );
  });

  const final = (await getRecordRow(record.id))!;
  await notifyUsers([doc.uploadedBy], {
    title: `Record ${record.id} verified`,
    body: `${final.ownerName} · Khasra ${final.khasraNumber} · ${final.village}`,
    link: `/records/${record.id}`,
  });
  await emitWebhookEvent("record.verified", { record: snapshotOf(toRecord(final)) });
  return toRecord(final);
}

export async function rejectRecord(recordId: string, comment: string, actor: Actor): Promise<LandRecord> {
  if (!comment?.trim()) throw new ServiceError("A reason is required to reject a record");
  const { record, doc } = await loadEditable(recordId);
  if (record.status !== "VERIFICATION_REQUIRED") throw new ServiceError("Record is not awaiting verification");
  const db = await getDb();
  const now = new Date().toISOString();
  await db.transaction(async (t) => {
    const tx = t as unknown as DB;
    const [updated] = await tx
      .update(records)
      .set({ status: "REJECTED", updatedAt: now, version: record.version + 1 })
      .where(eq(records.id, record.id))
      .returning();
    await writeVersion(tx, updated, `Rejected by ${actor.name}: ${comment}`, actor);
    await tx
      .update(verificationTasks)
      .set({ status: "REJECTED", updatedAt: now, comments: comment })
      .where(eq(verificationTasks.recordId, record.id));
    const steps = doc.steps.map((s) =>
      s.key === "human_verification" ? { ...s, status: "failed" as const, completedAt: now, error: `Rejected: ${comment}` } : s
    );
    await tx.update(documents).set({ status: "REJECTED", steps }).where(eq(documents.id, doc.id));
    await appendAudit(
      {
        action: "RECORD_REJECTED",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: comment,
      },
      tx
    );
  });
  await notifyUsers([doc.uploadedBy], {
    title: `Record ${record.id} rejected`,
    body: comment,
    link: `/documents/${doc.id}`,
  });
  const final = (await getRecordRow(record.id))!;
  await emitWebhookEvent("record.rejected", { record_id: record.id, reason: comment });
  return toRecord(final);
}

/** Sends a record back for AI reprocessing. The same record is updated (new version), never duplicated. */
export async function sendBackRecord(recordId: string, comment: string, actor: Actor): Promise<void> {
  if (!comment?.trim()) throw new ServiceError("A reason is required to send a record back");
  const { record, doc } = await loadEditable(recordId);
  if (record.status !== "VERIFICATION_REQUIRED") throw new ServiceError("Record is not awaiting verification");
  const db = await getDb();
  const now = new Date().toISOString();
  await db.transaction(async (t) => {
    const tx = t as unknown as DB;
    await tx
      .update(verificationTasks)
      .set({ status: "SENT_BACK", updatedAt: now, comments: comment })
      .where(eq(verificationTasks.recordId, record.id));
    await tx
      .update(documents)
      .set({ status: "QUEUED", pipelineState: { ...(doc.pipelineState ?? {}), reprocessReason: comment } })
      .where(eq(documents.id, doc.id));
    await appendAudit(
      {
        action: "RECORD_SENT_BACK",
        actor: actor.id,
        actorName: actor.name,
        documentId: record.documentId,
        recordId: record.id,
        details: comment,
      },
      tx
    );
  });
  await enqueueJob("process_document", { documentId: doc.id, restart: true });
}

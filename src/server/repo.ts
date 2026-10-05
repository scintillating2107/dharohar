import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  documents,
  documentPages,
  ocrResults,
  parcels,
  records,
  recordVersions,
  users,
  verificationTasks,
} from "@/server/db/schema";
import type {
  Document,
  DocumentPage,
  LandRecord,
  OCRResult,
  Parcel,
  RecordVersion,
  User,
  UserRole,
  VerificationTask,
  ProcessingStatus,
  RecordStatus,
  ValidationStatus,
  VerificationPriority,
  VerificationStatus,
  GeometrySource,
} from "@/types";

export type DocumentRow = typeof documents.$inferSelect;
export type PageRow = typeof documentPages.$inferSelect;
export type RecordRow = typeof records.$inferSelect;
export type TaskRow = typeof verificationTasks.$inferSelect;
export type ParcelRow = typeof parcels.$inferSelect;
export type UserRow = typeof users.$inferSelect;

export function iso(value: string | null | undefined): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    district: row.district ?? undefined,
    phone: row.phone ?? undefined,
    active: row.active,
    createdAt: iso(row.createdAt)!,
    lastLoginAt: iso(row.lastLoginAt),
    notificationPrefs: row.notificationPrefs ?? { email: true, sms: false, inApp: true },
  };
}

export async function getUserRow(id: string): Promise<UserRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export function pageUrl(documentId: string, page: number, variant: "page" | "enhanced" = "page"): string {
  return `/api/documents/${documentId}/file?page=${page}${variant === "enhanced" ? "&variant=enhanced" : ""}`;
}

export function toDocument(row: DocumentRow, pages: PageRow[]): Document {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const docPages: DocumentPage[] = sorted.length
    ? sorted.map((p) => ({
        page: p.page,
        width: p.width ?? undefined,
        height: p.height ?? undefined,
        imageUrl: pageUrl(row.id, p.page),
        processedImageUrl: p.enhancedKey ? pageUrl(row.id, p.page, "enhanced") : undefined,
        qualityBefore: p.qualityBefore ?? undefined,
        qualityAfter: p.qualityAfter ?? undefined,
        qualityScore: (p.qualityAfter ?? p.qualityBefore)?.score,
        blurDetected: (p.qualityAfter ?? p.qualityBefore)?.blurDetected,
        skewAngle: p.qualityBefore?.skewAngle,
        rotationCorrected: Math.abs(p.qualityBefore?.skewAngle ?? 0) >= 0.3,
        language: p.language ?? undefined,
        enhancedBy: p.enhancedBy ?? undefined,
      }))
    : [];
  return {
    id: row.id,
    name: row.name,
    fileType: row.fileType,
    fileSize: row.fileSize,
    sha256: row.sha256,
    pageCount: row.pageCount,
    uploadedBy: row.uploadedBy,
    uploadedByName: row.uploadedByName,
    uploadedAt: iso(row.uploadedAt)!,
    status: row.status as ProcessingStatus,
    steps: row.steps,
    pages: docPages,
    recordId: row.recordId ?? undefined,
    district: row.district ?? undefined,
    state: row.state ?? undefined,
    tehsil: row.tehsil ?? undefined,
    village: row.village ?? undefined,
    recordYear: row.recordYear ?? undefined,
    recordType: row.recordType ?? undefined,
    sourceOffice: row.sourceOffice ?? undefined,
    language: row.language ?? undefined,
    detectedLanguage: row.detectedLanguage ?? undefined,
    description: row.description ?? undefined,
    priority: row.priority ?? undefined,
    ocrEngine: row.ocrEngine ?? undefined,
    error: row.error ?? undefined,
  };
}

export async function getDocumentRow(id: string): Promise<DocumentRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(documents).where(eq(documents.id, id));
  return row;
}

export async function getPages(documentId: string): Promise<PageRow[]> {
  const db = await getDb();
  return db.select().from(documentPages).where(eq(documentPages.documentId, documentId)).orderBy(asc(documentPages.page));
}

export async function getDocument(id: string): Promise<Document | null> {
  const row = await getDocumentRow(id);
  if (!row) return null;
  return toDocument(row, await getPages(id));
}

export async function listDocuments(filter: {
  status?: string | null;
  search?: string | null;
  uploadedBy?: string | null;
  limit: number;
  offset: number;
}): Promise<{ items: Document[]; total: number }> {
  const db = await getDb();
  const conds: SQL[] = [];
  if (filter.status) conds.push(eq(documents.status, filter.status));
  if (filter.uploadedBy) conds.push(eq(documents.uploadedBy, filter.uploadedBy));
  if (filter.search) {
    const q = `%${filter.search}%`;
    conds.push(or(ilike(documents.name, q), ilike(documents.id, q), ilike(documents.district, q))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select()
    .from(documents)
    .where(where)
    .orderBy(desc(documents.uploadedAt))
    .limit(filter.limit)
    .offset(filter.offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(documents).where(where);
  const pageRows = rows.length
    ? await db.select().from(documentPages).where(inArray(documentPages.documentId, rows.map((r) => r.id)))
    : [];
  return {
    items: rows.map((r) => toDocument(r, pageRows.filter((p) => p.documentId === r.id))),
    total: count,
  };
}

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export async function getOcr(documentId: string): Promise<OCRResult | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(ocrResults).where(eq(ocrResults.documentId, documentId));
  if (!row) return undefined;
  return { document_id: documentId, pages: row.pages, engine: row.engine };
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export function toRecord(row: RecordRow, ocr?: OCRResult): LandRecord {
  return {
    record_id: row.id,
    document_id: row.documentId,
    version: row.version,
    owner_name: row.ownerName,
    father_name: row.fatherName ?? undefined,
    owners: row.owners,
    khasra_number: row.khasraNumber,
    khata_number: row.khataNumber,
    survey_number: row.surveyNumber ?? undefined,
    land_type: row.landType ?? undefined,
    area: row.area,
    area_unit: row.areaUnit,
    area_hectares: row.areaHectares ?? undefined,
    village: row.village,
    tehsil: row.tehsil,
    district: row.district,
    state: row.state,
    status: row.status as RecordStatus,
    fields: row.fields,
    validation: row.validation ?? undefined,
    ocr,
    averageConfidence: row.averageConfidence,
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
    verifiedAt: iso(row.verifiedAt),
    verifiedBy: row.verifiedBy ?? undefined,
    registration_number: row.registrationNumber ?? undefined,
    mutation_number: row.mutationNumber ?? undefined,
    mutation_date: row.mutationDate ?? undefined,
    record_year: row.recordYear ?? undefined,
    certificate: row.certificate ?? undefined,
    certification_hash: row.certificate?.record_hash,
    certified_at: row.certificate?.certified_at,
  };
}

export async function getRecordRow(id: string): Promise<RecordRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(records).where(eq(records.id, id));
  return row;
}

export async function getRecordByDocument(documentId: string): Promise<RecordRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(records).where(eq(records.documentId, documentId));
  return row;
}

export interface RecordFilter {
  status?: string | null;
  district?: string | null;
  search?: string | null;
  /** Restrict to these record ids (citizen scope) OR verified records */
  citizenRecordIds?: string[];
  validationStatus?: string | null;
  duplicatesOnly?: boolean;
  limit: number;
  offset: number;
}

export async function listRecords(filter: RecordFilter): Promise<{ items: LandRecord[]; total: number }> {
  const db = await getDb();
  const conds: SQL[] = [];
  if (filter.status) conds.push(eq(records.status, filter.status));
  if (filter.district) conds.push(ilike(records.district, filter.district));
  if (filter.validationStatus) conds.push(sql`${records.validation}->>'validation_status' = ${filter.validationStatus}`);
  if (filter.duplicatesOnly) conds.push(sql`(${records.validation}->'duplicate'->>'detected')::boolean = true`);
  if (filter.search) {
    const q = `%${filter.search}%`;
    conds.push(
      or(
        ilike(records.id, q),
        ilike(records.ownerName, q),
        ilike(records.khasraNumber, q),
        ilike(records.khataNumber, q),
        ilike(records.village, q),
        ilike(records.tehsil, q),
        ilike(records.district, q)
      )!
    );
  }
  if (filter.citizenRecordIds) {
    conds.push(
      filter.citizenRecordIds.length
        ? or(eq(records.status, "VERIFIED"), inArray(records.id, filter.citizenRecordIds))!
        : eq(records.status, "VERIFIED")
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select()
    .from(records)
    .where(where)
    .orderBy(desc(records.updatedAt))
    .limit(filter.limit)
    .offset(filter.offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(records).where(where);
  return { items: rows.map((r) => toRecord(r)), total: count };
}

export async function getRecordVersions(recordId: string): Promise<RecordVersion[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(recordVersions)
    .where(eq(recordVersions.recordId, recordId))
    .orderBy(asc(recordVersions.version), asc(recordVersions.createdAt));
  return rows.map((r) => ({
    id: r.id,
    record_id: r.recordId,
    version: r.version,
    reason: r.reason,
    created_by: r.createdBy,
    created_by_name: r.createdByName,
    created_at: iso(r.createdAt)!,
    snapshot: r.snapshot,
  }));
}

/** Record fields captured in a version snapshot (everything except OCR payloads). */
export function snapshotOf(record: LandRecord): Partial<LandRecord> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ocr, ...rest } = record;
  return rest;
}

// ---------------------------------------------------------------------------
// Verification tasks
// ---------------------------------------------------------------------------

export function toTask(row: TaskRow, record: Pick<RecordRow, "ownerName" | "village" | "district" | "khasraNumber">): VerificationTask {
  return {
    id: row.id,
    recordId: row.recordId,
    documentId: row.documentId,
    ownerName: record.ownerName,
    village: record.village,
    district: record.district,
    khasraNumber: record.khasraNumber,
    confidence: row.confidence,
    validationStatus: row.validationStatus as ValidationStatus,
    priority: row.priority as VerificationPriority,
    status: row.status as VerificationStatus,
    assignedTo: row.assignedTo ?? undefined,
    lastEditedBy: row.lastEditedBy ?? undefined,
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
    comments: row.comments ?? undefined,
  };
}

export async function getTaskForRecord(recordId: string): Promise<TaskRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(verificationTasks).where(eq(verificationTasks.recordId, recordId));
  return row;
}

// ---------------------------------------------------------------------------
// Parcels
// ---------------------------------------------------------------------------

export function toParcel(row: ParcelRow, record: RecordRow): Parcel {
  return {
    parcel_id: row.id,
    record_id: row.recordId,
    khasra_number: record.khasraNumber,
    owner_name: record.ownerName,
    area: record.area,
    area_unit: record.areaUnit,
    area_hectares: record.areaHectares ?? undefined,
    village: record.village,
    district: record.district,
    status: record.status as RecordStatus,
    geometry: row.geometry ?? null,
    geometry_source: row.geometrySource as GeometrySource,
    polygon_area_ha: row.polygonAreaHa,
    center: row.centerLat != null && row.centerLng != null ? { lat: row.centerLat, lng: row.centerLng } : null,
    location_note: row.locationNote ?? undefined,
    updated_at: iso(row.updatedAt),
  };
}

export async function getParcelForRecord(recordId: string): Promise<Parcel | null> {
  const db = await getDb();
  const [row] = await db.select().from(parcels).where(eq(parcels.recordId, recordId));
  if (!row) return null;
  const record = await getRecordRow(recordId);
  return record ? toParcel(row, record) : null;
}

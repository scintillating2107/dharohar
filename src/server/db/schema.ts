import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  serial,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  Certificate,
  ExtractedFieldValue,
  NotificationPrefs,
  OCRPageResult,
  Owner,
  PageQuality,
  ProcessingStep,
  ValidationResult,
  LandRecord,
} from "@/types";
import type { PipelineState } from "@/server/pipeline/state";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    district: text("district"),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").notNull().default(true),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    notificationPrefs: jsonb("notification_prefs").$type<NotificationPrefs>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key").notNull(),
    pageCount: integer("page_count").notNull().default(1),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedByName: text("uploaded_by_name").notNull(),
    uploadedAt: ts("uploaded_at").notNull().defaultNow(),
    status: text("status").notNull(),
    steps: jsonb("steps").$type<ProcessingStep[]>().notNull(),
    district: text("district"),
    state: text("state"),
    tehsil: text("tehsil"),
    village: text("village"),
    recordYear: text("record_year"),
    recordType: text("record_type"),
    sourceOffice: text("source_office"),
    language: text("language"),
    detectedLanguage: text("detected_language"),
    description: text("description"),
    priority: text("priority"),
    ocrEngine: text("ocr_engine"),
    recordId: text("record_id"),
    error: text("error"),
    pipelineState: jsonb("pipeline_state").$type<PipelineState>(),
  },
  (t) => [index("documents_status_idx").on(t.status), index("documents_sha_idx").on(t.sha256)]
);

export const documentPages = pgTable(
  "document_pages",
  {
    documentId: text("document_id").notNull(),
    page: integer("page").notNull(),
    width: integer("width"),
    height: integer("height"),
    originalKey: text("original_key").notNull(),
    enhancedKey: text("enhanced_key"),
    qualityBefore: jsonb("quality_before").$type<PageQuality>(),
    qualityAfter: jsonb("quality_after").$type<PageQuality>(),
    enhancedBy: text("enhanced_by"),
    language: text("language"),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.page] })]
);

export const ocrResults = pgTable("ocr_results", {
  documentId: text("document_id").primaryKey(),
  engine: text("engine").notNull(),
  pages: jsonb("pages").$type<OCRPageResult[]>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const records = pgTable(
  "records",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull(),
    ownerName: text("owner_name").notNull().default(""),
    fatherName: text("father_name"),
    owners: jsonb("owners").$type<Owner[]>().notNull().default([]),
    khasraNumber: text("khasra_number").notNull().default(""),
    khasraNormalized: text("khasra_normalized").notNull().default(""),
    khataNumber: text("khata_number").notNull().default(""),
    surveyNumber: text("survey_number"),
    landType: text("land_type"),
    area: doublePrecision("area").notNull().default(0),
    areaUnit: text("area_unit").notNull().default("hectare"),
    areaHectares: doublePrecision("area_hectares"),
    village: text("village").notNull().default(""),
    tehsil: text("tehsil").notNull().default(""),
    district: text("district").notNull().default(""),
    state: text("state").notNull().default(""),
    registrationNumber: text("registration_number"),
    mutationNumber: text("mutation_number"),
    mutationDate: text("mutation_date"),
    recordYear: integer("record_year"),
    fields: jsonb("fields").$type<Record<string, ExtractedFieldValue>>().notNull(),
    validation: jsonb("validation").$type<ValidationResult>(),
    averageConfidence: doublePrecision("average_confidence").notNull().default(0),
    certificate: jsonb("certificate").$type<Certificate>(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    verifiedAt: ts("verified_at"),
    verifiedBy: text("verified_by"),
  },
  (t) => [
    uniqueIndex("records_document_idx").on(t.documentId),
    index("records_khasra_idx").on(t.khasraNormalized),
    index("records_district_idx").on(t.district),
    index("records_status_idx").on(t.status),
  ]
);

export const recordVersions = pgTable(
  "record_versions",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id").notNull(),
    version: integer("version").notNull(),
    reason: text("reason").notNull(),
    snapshot: jsonb("snapshot").$type<Partial<LandRecord>>().notNull(),
    createdBy: text("created_by").notNull(),
    createdByName: text("created_by_name").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("record_versions_record_idx").on(t.recordId)]
);

export const verificationTasks = pgTable(
  "verification_tasks",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id").notNull(),
    documentId: text("document_id").notNull(),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    validationStatus: text("validation_status").notNull(),
    assignedTo: text("assigned_to"),
    lastEditedBy: text("last_edited_by"),
    comments: text("comments"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tasks_record_idx").on(t.recordId), index("tasks_status_idx").on(t.status)]
);

export const parcels = pgTable(
  "parcels",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id").notNull(),
    geometry: jsonb("geometry").$type<GeoJSON.Geometry | null>(),
    geometrySource: text("geometry_source").notNull().default("none"),
    polygonAreaHa: doublePrecision("polygon_area_ha"),
    centerLat: doublePrecision("center_lat"),
    centerLng: doublePrecision("center_lng"),
    locationNote: text("location_note"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by"),
  },
  (t) => [uniqueIndex("parcels_record_idx").on(t.recordId)]
);

export const auditLog = pgTable(
  "audit_log",
  {
    seq: serial("seq").primaryKey(),
    id: text("id").notNull(),
    ts: ts("ts").notNull(),
    actor: text("actor").notNull(),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    documentId: text("document_id"),
    recordId: text("record_id"),
    field: text("field"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    details: text("details"),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [
    uniqueIndex("audit_id_idx").on(t.id),
    index("audit_record_idx").on(t.recordId),
    index("audit_document_idx").on(t.documentId),
  ]
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAfter: ts("run_after").notNull().defaultNow(),
    lockedAt: ts("locked_at"),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("jobs_status_idx").on(t.status, t.runAfter)]
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)]
);

export const corrections = pgTable(
  "corrections",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id").notNull(),
    field: text("field").notNull(),
    aiValue: text("ai_value").notNull(),
    humanValue: text("human_value").notNull(),
    accepted: boolean("accepted").notNull(),
    source: text("source"),
    district: text("district"),
    recordType: text("record_type"),
    language: text("language"),
    ocrContext: text("ocr_context"),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("corrections_field_idx").on(t.field), index("corrections_record_idx").on(t.recordId)]
);

export const masterLocations = pgTable(
  "master_locations",
  {
    id: serial("id").primaryKey(),
    state: text("state").notNull(),
    district: text("district").notNull(),
    tehsil: text("tehsil"),
    village: text("village"),
    nameHi: text("name_hi"),
    lgdCode: text("lgd_code"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    level: text("level").notNull(),
  },
  (t) => [index("master_district_idx").on(t.district), index("master_level_idx").on(t.level)]
);

export const citizenClaims = pgTable(
  "citizen_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    recordId: text("record_id").notNull(),
    relationship: text("relationship").notNull(),
    note: text("note"),
    status: text("status").notNull().default("PENDING"),
    reviewedBy: text("reviewed_by"),
    reviewComment: text("review_comment"),
    createdAt: ts("created_at").notNull().defaultNow(),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [index("claims_user_idx").on(t.userId), index("claims_record_idx").on(t.recordId)]
);

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastUsedAt: ts("last_used_at"),
  revokedAt: ts("revoked_at"),
});

export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull(),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastDeliveryAt: ts("last_delivery_at"),
  lastStatus: text("last_status"),
});

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull(),
    email: text("email"),
    success: boolean("success").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ip, t.createdAt)]
);

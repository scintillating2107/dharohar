// User & Auth
export type UserRole =
  | "ADMIN"
  | "VERIFICATION_OFFICER"
  | "DATA_OFFICER"
  | "SURVEY_OFFICER"
  | "CITIZEN";

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  district?: string;
  phone?: string;
  active?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  notificationPrefs?: NotificationPrefs;
}

// Document Processing
export type ProcessingStatus =
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "IMAGE_PROCESSING"
  | "OCR_PROCESSING"
  | "OCR_COMPLETED"
  | "EXTRACTION_PROCESSING"
  | "EXTRACTED"
  | "VALIDATION_PROCESSING"
  | "VALIDATED"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "FAILED";

export type ProcessingStepKey =
  | "upload"
  | "pdf_processing"
  | "image_enhancement"
  | "language_detection"
  | "ocr"
  | "field_extraction"
  | "validation"
  | "human_verification"
  | "final_storage";

export interface ProcessingStep {
  key: ProcessingStepKey;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  /** Short human-readable outcome, e.g. "3 pages, skew corrected 2.1°" */
  detail?: string;
}

export interface PageQuality {
  /** 0–100 composite score */
  score: number;
  /** Variance of the Laplacian — low values mean blur */
  sharpness: number;
  blurDetected: boolean;
  /** Mean luminance 0–255 */
  brightness: number;
  /** Luminance standard deviation */
  contrast: number;
  /** Estimated residual noise (mean abs. difference to median-filtered image) */
  noise: number;
  skewAngle: number;
}

export interface DocumentPage {
  page: number;
  width?: number;
  height?: number;
  imageUrl?: string;
  processedImageUrl?: string;
  qualityBefore?: PageQuality;
  qualityAfter?: PageQuality;
  /** Kept for older UI consumers: equals qualityAfter.score */
  qualityScore?: number;
  blurDetected?: boolean;
  skewAngle?: number;
  rotationCorrected?: boolean;
  language?: string;
  enhancedBy?: string;
}

export interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  sha256?: string;
  pageCount: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  status: ProcessingStatus;
  steps: ProcessingStep[];
  pages: DocumentPage[];
  recordId?: string;
  district?: string;
  state?: string;
  tehsil?: string;
  village?: string;
  recordYear?: string;
  recordType?: string;
  sourceOffice?: string;
  language?: string;
  detectedLanguage?: string;
  description?: string;
  priority?: string;
  ocrEngine?: string;
  error?: string;
}

// OCR
export interface OCRRegion {
  text: string;
  confidence: number;
  /** Pixel box on the processed page image: [x1, y1, x2, y2] */
  bbox: [number, number, number, number];
  fieldKey?: string;
}

export interface OCRPageResult {
  page: number;
  language: string;
  text: string;
  regions: OCRRegion[];
  width?: number;
  height?: number;
  engine?: string;
  meanConfidence?: number;
}

export interface OCRResult {
  document_id: string;
  pages: OCRPageResult[];
  engine?: string;
}

// Image processing (Member 2 contract, kept for the optional ML service)
export interface ImageProcessingPage {
  page: number;
  processed_image_url: string;
  quality_score: number;
  blur_detected: boolean;
  skew_angle: number;
  rotation_corrected: boolean;
}

export interface ImageProcessingResult {
  document_id: string;
  pages: ImageProcessingPage[];
}

// Field extraction
export type FieldSource = "gemini" | "rules" | "learned" | "officer" | "metadata";

export interface FieldLocation {
  page: number;
  bbox: [number, number, number, number];
}

export interface ExtractedFieldValue {
  value: string;
  unit?: string;
  confidence: number;
  /** OCR confidence of the matched source words, if located */
  ocrConfidence?: number;
  /** Model / rule confidence before combining with OCR confidence */
  modelConfidence?: number;
  source?: FieldSource;
  location?: FieldLocation;
  /** @deprecated use location */
  bbox?: [number, number, number, number];
  needsReview?: boolean;
  /** The value originally proposed by the AI, if an officer or learned rule changed it */
  aiValue?: string;
  note?: string;
}

export interface Owner {
  name: string;
  relation_name?: string;
  relation_type?: "S/O" | "D/O" | "W/O" | "C/O" | string;
  share?: number;
  address?: string;
}

export interface ExtractionResult {
  document_id: string;
  fields: Record<string, ExtractedFieldValue>;
  owners?: Owner[];
  engine?: string;
}

// Validation
export type ValidationStatus = "VALID" | "REVIEW_REQUIRED" | "INVALID";

export interface ValidationWarning {
  field: string;
  type: string;
  message: string;
  current_value?: string;
  previous_value?: string;
  related_record_id?: string;
}

export interface ValidationError {
  field: string;
  type: string;
  message: string;
}

export interface ValidationResult {
  document_id: string;
  validation_status: ValidationStatus;
  validation_score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duplicate: {
    detected: boolean;
    similarity: number;
    record_id?: string;
  };
  passed_checks?: string[];
  validated_at?: string;
}

// Certification
export interface Certificate {
  record_id: string;
  version: number;
  record_hash: string;
  document_sha256: string | null;
  certified_at: string;
  certified_by: string;
  audit_head: string | null;
  key_id: string;
  algorithm: "Ed25519";
  signature: string;
}

// Land record
export type RecordStatus =
  | "DRAFT"
  | "EXTRACTED"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED";

export interface LandRecord {
  record_id: string;
  document_id: string;
  /** Optional only for compatibility with the retired JSON-store prototype modules */
  version?: number;
  owner_name: string;
  father_name?: string;
  owners?: Owner[];
  khasra_number: string;
  khata_number: string;
  survey_number?: string;
  land_type?: string;
  area: number;
  area_unit: string;
  area_hectares?: number;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  status: RecordStatus;
  fields: Record<string, ExtractedFieldValue>;
  validation?: ValidationResult;
  ocr?: OCRResult;
  averageConfidence: number;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  registration_number?: string;
  mutation_number?: string;
  mutation_date?: string;
  record_year?: number;
  certificate?: Certificate;
  /** @deprecated use certificate.record_hash */
  certification_hash?: string;
  certified_at?: string;
}

export interface RecordVersion {
  id: string;
  record_id: string;
  version: number;
  reason: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  snapshot: Partial<LandRecord>;
}

// Verification
export type VerificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type VerificationStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "SENT_BACK";

export interface VerificationTask {
  id: string;
  recordId: string;
  documentId: string;
  ownerName: string;
  village: string;
  district: string;
  khasraNumber: string;
  confidence: number;
  validationStatus: ValidationStatus;
  priority: VerificationPriority;
  status: VerificationStatus;
  assignedTo?: string;
  lastEditedBy?: string;
  createdAt: string;
  updatedAt: string;
  comments?: string;
}

export interface VerificationAction {
  action: "save_draft" | "approve" | "reject" | "send_back";
  fields?: Record<string, string>;
  owners?: Owner[];
  comment?: string;
}

// GIS
export type GeometrySource = "surveyed" | "approximate" | "none";

export interface Parcel {
  parcel_id: string;
  record_id: string;
  khasra_number: string;
  owner_name: string;
  area: number;
  area_unit: string;
  area_hectares?: number;
  village: string;
  district: string;
  status: RecordStatus;
  geometry?: GeoJSON.Geometry | null;
  /** Optional only for compatibility with the retired JSON-store prototype modules */
  geometry_source?: GeometrySource;
  polygon_area_ha?: number | null;
  center: { lat: number; lng: number } | null;
  location_note?: string;
  updated_at?: string;
}

// Audit
export type AuditActionType =
  | "DOCUMENT_UPLOADED"
  | "PROCESSING_QUEUED"
  | "PROCESSING_STARTED"
  | "PROCESSING_COMPLETED"
  | "PROCESSING_FAILED"
  | "OCR_COMPLETED"
  | "EXTRACTION_COMPLETED"
  | "VALIDATION_COMPLETED"
  | "VERIFICATION_STARTED"
  | "FIELD_EDITED"
  | "OWNERS_EDITED"
  | "RECORD_APPROVED"
  | "RECORD_AUTO_APPROVED"
  | "RECORD_REJECTED"
  | "RECORD_SENT_BACK"
  | "RECORD_PERSISTED"
  | "DRAFT_SAVED"
  | "CERTIFICATE_GENERATED"
  | "PARCEL_GEOMETRY_UPDATED"
  | "USER_LOGIN"
  | "USER_LOGIN_FAILED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "PASSWORD_CHANGED"
  | "SETTINGS_UPDATED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "WEBHOOK_CREATED"
  | "CLAIM_SUBMITTED"
  | "CLAIM_REVIEWED"
  | "MASTER_DATA_IMPORTED";

export interface AuditEvent {
  id: string;
  seq?: number;
  documentId?: string;
  recordId?: string;
  timestamp: string;
  actor: string;
  actorName: string;
  action: AuditActionType;
  field?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
  hash?: string;
  prevHash?: string;
}

// System settings (server-side)
export interface SystemSettings {
  /** Fields below this confidence are flagged for review (0–1) */
  reviewThreshold: number;
  /** Tasks with average confidence below this get HIGH priority (0–1) */
  highPriorityThreshold: number;
  autoApproveEnabled: boolean;
  /** Records at or above this average confidence and VALID are auto-approved (0–1) */
  autoApproveThreshold: number;
  /** The officer who last edited a record cannot approve it */
  makerChecker: boolean;
  /** Allowed difference between surveyed polygon area and recorded area, in percent */
  areaTolerancePct: number;
  /** Use officer corrections as few-shot examples for extraction */
  learningEnabled: boolean;
}

// Notifications
export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}

// Citizen claims
export interface CitizenClaim {
  id: string;
  userId: string;
  userName?: string;
  recordId: string;
  relationship: string;
  note?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewComment?: string;
  createdAt: string;
  reviewedAt?: string;
}

// Integrations
export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

export interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastDeliveryAt?: string | null;
  lastStatus?: string | null;
}

// Dashboard
export interface DashboardStats {
  total_documents: number;
  processed_documents: number;
  verified_records: number;
  pending_verification: number;
  validation_issues: number;
  average_confidence: number;
  /** % of AI-extracted fields that officers accepted without change (null until data exists) */
  extraction_accuracy: number | null;
  failed_documents: number;
}

export interface DistrictProgress {
  district: string;
  state: string;
  total: number;
  processed: number;
  verified: number;
  percentage: number;
}

export interface StateProgress {
  state: string;
  total: number;
  processed: number;
  verified: number;
  percentage: number;
}

export interface RecentDocument {
  id: string;
  name: string;
  status: ProcessingStatus;
  uploadedAt: string;
  uploadedBy: string;
  district?: string;
}

export interface RecentVerificationActivity {
  id: string;
  recordId: string;
  ownerName: string;
  action: string;
  actor: string;
  timestamp: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadResult {
  document: Document;
  message: string;
}

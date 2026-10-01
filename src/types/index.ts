// User & Auth
export type UserRole =
  | "ADMIN"
  | "VERIFICATION_OFFICER"
  | "DATA_OFFICER"
  | "SURVEY_OFFICER"
  | "CITIZEN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  district?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

// Document Processing
export type ProcessingStatus =
  | "UPLOADED"
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
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface DocumentPage {
  page: number;
  imageUrl?: string;
  processedImageUrl?: string;
  qualityScore?: number;
  blurDetected?: boolean;
  skewAngle?: number;
  rotationCorrected?: boolean;
}

export interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
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
  description?: string;
  priority?: string;
}

// OCR (Member 3 contract)
export interface OCRRegion {
  text: string;
  confidence: number;
  bbox: [number, number, number, number];
  fieldKey?: string;
}

export interface OCRPageResult {
  page: number;
  language: string;
  text: string;
  regions: OCRRegion[];
}

export interface OCRResult {
  document_id: string;
  pages: OCRPageResult[];
}

// Image Processing (Member 2 contract)
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

// Field Extraction (Member 4 contract)
export interface ExtractedFieldValue {
  value: string;
  unit?: string;
  confidence: number;
  bbox?: [number, number, number, number];
  needsReview?: boolean;
}

export interface ExtractionResult {
  document_id: string;
  fields: Record<string, ExtractedFieldValue>;
}

// Validation (Member 5 contract)
export type ValidationStatus = "VALID" | "REVIEW_REQUIRED" | "INVALID";

export interface ValidationWarning {
  field: string;
  type: string;
  message: string;
  current_value?: string;
  previous_value?: string;
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
}

// Land Record (Member 6 contract)
export type RecordStatus =
  | "DRAFT"
  | "EXTRACTED"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED";

export interface LandRecord {
  record_id: string;
  document_id: string;
  owner_name: string;
  father_name?: string;
  khasra_number: string;
  khata_number: string;
  area: number;
  area_unit: string;
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
  certification_hash?: string;
  certified_at?: string;
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
  createdAt: string;
  updatedAt: string;
  comments?: string;
}

export interface VerificationAction {
  action: "save_draft" | "approve" | "reject" | "send_back";
  fields?: Record<string, string>;
  comment?: string;
}

// GIS (Member 6 contract)
export interface Parcel {
  parcel_id: string;
  record_id: string;
  khasra_number: string;
  owner_name: string;
  area: number;
  area_unit: string;
  village: string;
  district: string;
  status: RecordStatus;
  geometry?: GeoJSON.Geometry;
  center: { lat: number; lng: number };
}

// Audit
export type AuditActionType =
  | "DOCUMENT_UPLOADED"
  | "PROCESSING_STARTED"
  | "PROCESSING_COMPLETED"
  | "OCR_COMPLETED"
  | "EXTRACTION_COMPLETED"
  | "VALIDATION_COMPLETED"
  | "VERIFICATION_STARTED"
  | "FIELD_EDITED"
  | "RECORD_APPROVED"
  | "RECORD_REJECTED"
  | "RECORD_SENT_BACK"
  | "RECORD_PERSISTED"
  | "DRAFT_SAVED"
  | "CERTIFICATE_GENERATED";

export interface AuditEvent {
  id: string;
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
}

// Dashboard
export interface DashboardStats {
  total_documents: number;
  processed_documents: number;
  verified_records: number;
  pending_verification: number;
  validation_issues: number;
  average_confidence: number;
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

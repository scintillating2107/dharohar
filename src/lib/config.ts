import type { ProcessingStepKey, UserRole } from "@/types";

export const APP_NAME = "Dharohar";
export const APP_DESCRIPTION =
  "Land record digitization, validation, and verification services for revenue and survey offices.";

/** UI defaults; the authoritative thresholds are the server-side system settings. */
export const HIGH_CONFIDENCE_THRESHOLD = 0.9;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.75;

export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/tiff"];
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff"];

export const FIELD_LABELS: Record<string, string> = {
  owner_name: "Owner Name",
  father_name: "Father's / Husband's Name",
  khasra_number: "Khasra Number",
  khata_number: "Khata Number",
  survey_number: "Survey Number",
  area: "Area",
  area_unit: "Area Unit",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  state: "State",
  land_type: "Land Classification",
  registration_number: "Registration Number",
  mutation_number: "Mutation Number",
  mutation_date: "Mutation Date",
};

export const FIELD_SECTIONS: Record<string, string[]> = {
  "Owner Information": ["owner_name", "father_name"],
  "Land Information": ["khasra_number", "khata_number", "survey_number", "area", "land_type"],
  Location: ["village", "tehsil", "district", "state"],
  "Registration & Mutation": ["registration_number", "mutation_number", "mutation_date"],
};

export const AREA_UNITS = [
  "hectare",
  "acre",
  "bigha",
  "biswa",
  "biswansi",
  "sqm",
  "sqft",
  "decimal",
  "kanal",
  "marla",
  "guntha",
  "are",
];

export const DOCUMENT_LANGUAGES: { code: string; label: string }[] = [
  { code: "auto", label: "Auto-detect" },
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "pa", label: "Punjabi" },
  { code: "gu", label: "Gujarati" },
  { code: "or", label: "Odia" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "ur", label: "Urdu" },
];

export const PROCESSING_STEPS: { key: ProcessingStepKey; label: string }[] = [
  { key: "upload", label: "Document Uploaded" },
  { key: "pdf_processing", label: "Page Rendering" },
  { key: "image_enhancement", label: "Image Enhancement" },
  { key: "language_detection", label: "Orientation & Language Detection" },
  { key: "ocr", label: "OCR" },
  { key: "field_extraction", label: "Field Extraction" },
  { key: "validation", label: "Validation" },
  { key: "human_verification", label: "Human Verification" },
  { key: "final_storage", label: "Certification & Storage" },
];

export type Permission =
  | "dashboard"
  | "documents"
  | "upload"
  | "verification"
  | "records"
  | "validation"
  | "gis"
  | "gis_edit"
  | "audit"
  | "users"
  | "settings_admin"
  | "integrations"
  | "analytics"
  | "claims"
  | "citizen"
  | "profile";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard",
    "documents",
    "upload",
    "verification",
    "records",
    "validation",
    "gis",
    "gis_edit",
    "audit",
    "users",
    "settings_admin",
    "integrations",
    "analytics",
    "claims",
    "profile",
  ],
  VERIFICATION_OFFICER: [
    "dashboard",
    "documents",
    "verification",
    "records",
    "validation",
    "gis",
    "audit",
    "analytics",
    "claims",
    "profile",
  ],
  DATA_OFFICER: ["dashboard", "documents", "upload", "records", "validation", "audit", "profile"],
  SURVEY_OFFICER: ["dashboard", "records", "gis", "gis_edit", "audit", "analytics", "profile"],
  CITIZEN: ["citizen", "records", "gis", "profile"],
};

export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Training accounts shown on the login page (only seeded outside production by default). */
export const DEMO_LOGINS =
  process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "false" ||
  (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== "true")
    ? []
    : [
        { email: "data@dharohar.gov", password: "data123", role: "DATA_OFFICER" as const },
        { email: "verification@dharohar.gov", password: "verify123", role: "VERIFICATION_OFFICER" as const },
        { email: "survey@dharohar.gov", password: "survey123", role: "SURVEY_OFFICER" as const },
        { email: "admin@dharohar.gov", password: "admin123", role: "ADMIN" as const },
        { email: "citizen@dharohar.gov", password: "citizen123", role: "CITIZEN" as const },
      ];

// ---------------------------------------------------------------------------
// Legacy exports — only referenced by the superseded JSON-store modules that are blocked in
// middleware and excluded from type-checking (see tsconfig "exclude"). Safe to remove together
// with those files.
// ---------------------------------------------------------------------------
/** @deprecated mock mode was removed */
export const USE_MOCK_DATA = false;
/** @deprecated use src/server/env.ts */
export const JWT_SECRET = process.env.JWT_SECRET || "dharohar-dev-secret-change-in-production";
/** @deprecated */
export const JWT_EXPIRY = "24h";
/** @deprecated */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
/** @deprecated use DEMO_LOGINS */
export const DEMO_CREDENTIALS = DEMO_LOGINS;

/** Display names for validation issue types (shared by validation views and analytics). */
export const ISSUE_LABELS: Record<string, string> = {
  MISSING_FIELD: "Missing field",
  LOW_CONFIDENCE: "Low OCR / extraction confidence",
  DUPLICATE_CANDIDATE: "Possible duplicate",
  DUPLICATE_DOCUMENT: "Duplicate upload",
  HISTORICAL_MISMATCH: "Area differs from history",
  OWNERSHIP_CHANGE: "Ownership change",
  LOCATION_MISMATCH: "Location not in master data",
  LOCATION_UNVERIFIED: "Location not verifiable",
  FORMAT_WARNING: "Format problem",
  AREA_IMPLAUSIBLE: "Implausible area",
  UNKNOWN_UNIT: "Unknown area unit",
  SHARE_MISMATCH: "Owner shares ≠ 100%",
  DATE_INVALID: "Invalid date",
  NAME_CONFLICT: "Name conflict",
  METADATA_ONLY: "Not found in document",
  PARCEL_AREA_MISMATCH: "Surveyed area mismatch",
  INVALID_AREA: "Invalid area",
};

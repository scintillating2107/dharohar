export const APP_NAME = "Dharohar";
export const APP_DESCRIPTION =
  "AI-powered Land Record Intelligence and Verification Platform";

export const HIGH_CONFIDENCE_THRESHOLD = 0.9;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.75;

export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api";

export const JWT_SECRET =
  process.env.JWT_SECRET || "dharohar-dev-secret-change-in-production";

export const JWT_EXPIRY = "24h";

export const FIELD_LABELS: Record<string, string> = {
  owner_name: "Owner Name",
  father_name: "Father's Name",
  khasra_number: "Khasra Number",
  khata_number: "Khata Number",
  area: "Area",
  village: "Village",
  tehsil: "Tehsil",
  district: "District",
  state: "State",
  registration_number: "Registration Number",
  mutation_number: "Mutation Number",
  mutation_date: "Mutation Date",
  survey_number: "Survey Number",
  land_type: "Land Type",
};

export const FIELD_SECTIONS: Record<string, string[]> = {
  "Owner Information": ["owner_name", "father_name"],
  "Land Information": [
    "khasra_number",
    "khata_number",
    "area",
    "survey_number",
    "land_type",
  ],
  Location: ["village", "tehsil", "district", "state"],
  "Registration Information": ["registration_number"],
  "Mutation Information": ["mutation_number", "mutation_date"],
};

export const PROCESSING_STEPS: {
  key: import("@/types").ProcessingStepKey;
  label: string;
}[] = [
  { key: "upload", label: "Document Uploaded" },
  { key: "pdf_processing", label: "PDF Processing" },
  { key: "image_enhancement", label: "Image Enhancement" },
  { key: "language_detection", label: "Language Detection" },
  { key: "ocr", label: "OCR" },
  { key: "field_extraction", label: "Field Extraction" },
  { key: "validation", label: "Validation" },
  { key: "human_verification", label: "Human Verification" },
  { key: "final_storage", label: "Final Storage" },
];

export const ROLE_PERMISSIONS: Record<
  import("@/types").UserRole,
  string[]
> = {
  ADMIN: [
    "dashboard",
    "documents",
    "verification",
    "records",
    "validation",
    "gis",
    "audit",
    "users",
    "profile",
  ],
  VERIFICATION_OFFICER: [
    "dashboard",
    "documents",
    "verification",
    "records",
    "validation",
    "audit",
    "profile",
  ],
  DATA_OFFICER: ["dashboard", "documents", "records", "profile"],
  SURVEY_OFFICER: ["dashboard", "records", "gis", "profile"],
};

export const DEMO_CREDENTIALS = [
  {
    email: "admin@dharohar.gov",
    password: "admin123",
    role: "ADMIN" as const,
  },
  {
    email: "verification@dharohar.gov",
    password: "verify123",
    role: "VERIFICATION_OFFICER" as const,
  },
  {
    email: "data@dharohar.gov",
    password: "data123",
    role: "DATA_OFFICER" as const,
  },
  {
    email: "survey@dharohar.gov",
    password: "survey123",
    role: "SURVEY_OFFICER" as const,
  },
];

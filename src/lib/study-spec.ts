/** Study problem statement & expected solution — used for UI and docs alignment */

export const STUDY_TITLE =
  "Intelligent Land Record Digitization and Validation System";

export const STUDY_TAGLINE =
  "Digitize legacy registers and scans, validate extracted fields, and publish verified records for LRMS and GIS programmes.";

export const STUDY_PILLARS = [
  {
    title: "Multilingual recognition",
    description:
      "Script and orientation detection, Tesseract OCR models for 12 languages, and Gemini transcription for handwritten records.",
  },
  {
    title: "Structured extraction",
    description:
      "Automatic classification into owner, survey/khasra/khata, plot area, village–tehsil–district, land type, registration, and mutation fields.",
  },
  {
    title: "Validation & duplicates",
    description:
      "Business rules, consistency checks, validation scoring, and duplicate detection before records enter the verified inventory.",
  },
  {
    title: "Confidence & human review",
    description:
      "Per-field confidence scores; low-confidence and validation failures route to verification officers with audit trail.",
  },
  {
    title: "LRMS / GIS integration",
    description:
      "API keys, GeoJSON parcels, bulk export and signed webhooks for LRMS / DILRMP / GIS systems; surveyed parcel boundaries with area cross-checks.",
  },
  {
    title: "Governance & RBAC",
    description:
      "Role-based portals (operations, verification, survey, citizen, admin), secure document repository, and immutable audit logging.",
  },
] as const;

export const EXTRACTED_FIELD_GROUPS = [
  {
    group: "Ownership",
    fields: ["owner_name", "father_name"],
  },
  {
    group: "Survey & plot",
    fields: ["survey_number", "khasra_number", "khata_number", "area", "land_type"],
  },
  {
    group: "Administrative location",
    fields: ["village", "tehsil", "district", "state"],
  },
  {
    group: "Registration & mutation",
    fields: ["registration_number", "mutation_number", "mutation_date"],
  },
] as const;

export const STAKEHOLDERS = [
  "Revenue & land record offices",
  "Survey departments",
  "District & state administration",
  "Citizens",
  "Central programmes (DILRMP / LRMS)",
] as const;

export const SUGGESTED_TECH_STACK = [
  { component: "Application & APIs", technology: "Next.js 16, TypeScript, versioned REST API (/api/v1) with OpenAPI spec" },
  { component: "Database", technology: "PostgreSQL via Drizzle ORM (embedded PGlite for single-machine installs)" },
  { component: "Job processing", technology: "Postgres-backed durable job queue with retries and resume-from-failed-step" },
  { component: "Computer vision", technology: "sharp/libvips: deskew, background flattening, denoise; optional RealESRGAN service" },
  { component: "OCR & NLP", technology: "Tesseract (word boxes, OSD script/orientation) + Gemini transcription & extraction" },
  { component: "GIS", technology: "Leaflet + Geoman drawing, GeoJSON/KML import, Turf geodesic area" },
  { component: "Integrity", technology: "SHA-256 file fingerprints, hash-chained audit log, Ed25519-signed certificates" },
  { component: "Notifications", technology: "In-app notifications, SMTP email, SMS gateway webhook" },
  { component: "Deployment", technology: "Docker Compose (app + PostgreSQL) or Vercel with managed Postgres and S3 storage" },
] as const;

export const DASHBOARD_METRICS_STUDY = [
  "Number of documents processed",
  "Extraction accuracy",
  "Validation status",
  "Pending verification cases",
  "Error statistics",
  "State-wise and district-wise digitization progress",
] as const;

export const EXPECTED_SOLUTION_ITEMS = [
  "Multilingual document recognition across major Indian languages",
  "Automatic extraction from scanned PDFs, images, and historical documents",
  "Intelligent classification into predefined land record fields",
  "Automated validation — business rules, cross-database verification, duplicate detection",
  "Confidence scoring with identification of uncertain fields",
  "Human-assisted verification for low-confidence records",
  "AI-driven learning mechanism improving extraction accuracy over time",
  "Integration with LRMS, DILRMP, GIS platforms, and cadastral maps",
  "Secure document repository with metadata management and audit trails",
] as const;

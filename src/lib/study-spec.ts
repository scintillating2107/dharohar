/** Study problem statement & expected solution — used for UI and docs alignment */

export const STUDY_TITLE =
  "Intelligent Land Record Digitization and Validation System";

export const STUDY_TAGLINE =
  "Digitize legacy registers and scans, validate extracted fields, and publish verified records for LRMS and GIS programmes.";

export const STUDY_PILLARS = [
  {
    title: "Multilingual recognition",
    description:
      "OCR and NLP for printed and handwritten text; language detection step in the pipeline with support for major Indian languages via Gemini / Indic-capable models.",
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
      "REST APIs and integration hooks for image processing, OCR, extraction, validation, and parcel storage; Leaflet GIS for cadastral linkage.",
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
  { component: "Application & APIs", technology: "Next.js, TypeScript, RESTful APIs" },
  { component: "Database & GIS", technology: "PostgreSQL + PostGIS (target); Leaflet maps in UI" },
  { component: "Computer vision", technology: "OpenCV, RealESRGAN enhancement (Member 2 service)" },
  { component: "OCR & NLP", technology: "Gemini / PaddleOCR, semantic field extraction" },
  { component: "Validation", technology: "Rule engine + duplicate detection (Member 5)" },
  { component: "Dashboards", technology: "Recharts — processing, validation, state/district progress" },
  { component: "Notifications", technology: "In-app notifications API (SMS/email gateway ready)" },
  { component: "Cloud (deployment)", technology: "NIC MeghRaj / AWS Gov / Azure — container-ready services" },
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

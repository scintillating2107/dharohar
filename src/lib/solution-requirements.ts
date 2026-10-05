export type RequirementStatus = "implemented" | "partial" | "roadmap";

export interface SolutionRequirement {
  id: string;
  label: string;
  status: RequirementStatus;
  summary: string;
  demoHint?: string;
}

export const SOLUTION_REQUIREMENTS: SolutionRequirement[] = [
  {
    id: "multilingual",
    label: "Multilingual recognition",
    status: "implemented",
    summary:
      "Tesseract OSD detects script and page orientation; OCR models for Hindi, Marathi, Bengali, Punjabi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Urdu and English.",
    demoHint: "Document → processing → language step",
  },
  {
    id: "handwriting",
    label: "Handwritten text",
    status: "partial",
    summary:
      "Handwriting is transcribed by Gemini when GEMINI_API_KEY is configured; Tesseract alone handles printed text only.",
    demoHint: "Integrations → OCR engine",
  },
  {
    id: "extract-auto",
    label: "Extraction from PDFs & images",
    status: "implemented",
    summary: "PDF, JPEG, PNG and multi-page TIFF; pages rendered, enhanced and OCR'd by a durable background job queue.",
    demoHint: "Upload → Start processing",
  },
  {
    id: "classification",
    label: "Field classification",
    status: "implemented",
    summary:
      "Owners and shares, father/husband, khasra, khata, survey no., area with unit, village–tehsil–district–state, land type, registration and mutation — each linked to its location on the scan.",
    demoHint: "Verification workspace",
  },
  {
    id: "validation",
    label: "Validation & duplicates",
    status: "implemented",
    summary:
      "Required fields, formats, area units by state, dates, owner shares, master-data place checks, cross-script fuzzy duplicates, identical-file detection and history comparison.",
    demoHint: "/validation",
  },
  {
    id: "confidence",
    label: "Confidence scoring",
    status: "implemented",
    summary: "Per-field confidence combines model certainty with the OCR confidence of the matched words; thresholds are admin-configurable.",
    demoHint: "System settings → thresholds",
  },
  {
    id: "human",
    label: "Human-assisted verification",
    status: "implemented",
    summary: "Split-screen review with source highlighting, edits, owners editor, maker-checker option, approve / reject / send back.",
    demoHint: "/verification",
  },
  {
    id: "learning",
    label: "Learning over time",
    status: "implemented",
    summary:
      "Officer corrections feed few-shot prompts and learned substitutions, measure field accuracy month by month, and export as a JSONL training set. Model fine-tuning itself is run outside the app.",
    demoHint: "/analytics → accuracy",
  },
  {
    id: "gis-lrms",
    label: "LRMS / DILRMP / GIS",
    status: "partial",
    summary:
      "Versioned REST API with API keys, GeoJSON parcels, CSV/JSON export and signed webhooks; surveyed boundaries via GeoJSON/KML upload or drawing. Connecting a specific state LRMS endpoint is deployment configuration.",
    demoHint: "/integrations",
  },
  {
    id: "repository",
    label: "Secure repository & audit",
    status: "implemented",
    summary: "SHA-256 fingerprinted originals, versioned records, hash-chained audit log, Ed25519-signed certificates with public QR verification.",
    demoHint: "/audit · /trust",
  },
  {
    id: "dashboards",
    label: "Monitoring dashboards",
    status: "implemented",
    summary: "Throughput, measured extraction accuracy, validation outcomes, error categories, step timings, district progress.",
    demoHint: "/dashboard · /analytics",
  },
  {
    id: "rbac",
    label: "Role-based access control",
    status: "implemented",
    summary: "Admin, data, verification, survey and citizen roles; login throttling and lockout; citizen access via approved ownership claims.",
    demoHint: "/users",
  },
  {
    id: "cv",
    label: "Computer vision",
    status: "implemented",
    summary:
      "Measured sharpness, contrast, noise and skew; deskew, background flattening, denoising and orientation correction. Optional RealESRGAN service. Cadastral map-sheet vectorisation is not in scope yet.",
    demoHint: "Document → preview & quality",
  },
];

export const DEMO_WALKTHROUGH_STEPS = [
  { step: 1, role: "Data Officer", email: "data@dharohar.gov", action: "Upload a land record PDF/scan and start processing." },
  { step: 2, role: "Verification Officer", email: "verification@dharohar.gov", action: "Review flagged fields against the highlighted scan; approve to certify." },
  { step: 3, role: "Survey Officer", email: "survey@dharohar.gov", action: "Upload or draw the surveyed parcel boundary; area is cross-checked." },
  { step: 4, role: "Citizen", email: "citizen@dharohar.gov", action: "Claim a record, track approval and verify certificates by QR." },
  { step: 5, role: "Admin", email: "admin@dharohar.gov", action: "Thresholds, master data, users, API keys, webhooks and audit integrity." },
] as const;

export function solutionRequirementStats() {
  const implemented = SOLUTION_REQUIREMENTS.filter((r) => r.status === "implemented").length;
  const partial = SOLUTION_REQUIREMENTS.filter((r) => r.status === "partial").length;
  const roadmap = SOLUTION_REQUIREMENTS.filter((r) => r.status === "roadmap").length;
  return { implemented, partial, roadmap, total: SOLUTION_REQUIREMENTS.length };
}

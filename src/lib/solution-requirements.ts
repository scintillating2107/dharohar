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
    status: "partial",
    summary: "Language detection + OCR (Gemini / Paddle); Hindi–English demonstrated; extensible to major Indic languages.",
    demoHint: "OCR preview → detected language",
  },
  {
    id: "extract-auto",
    label: "Extraction from PDFs & images",
    status: "implemented",
    summary: "Legacy PDFs, scans, multi-page documents via upload and automated pipeline.",
    demoHint: "Upload → Start Processing",
  },
  {
    id: "classification",
    label: "Field classification",
    status: "implemented",
    summary: "Owner, survey/khasra/khata, area, village–tehsil–district, land type, registration, mutation.",
    demoHint: "Record detail after extraction",
  },
  {
    id: "validation",
    label: "Validation & duplicates",
    status: "partial",
    summary: "Business rules, duplicate detection, historical checks; external master DB sync via integration APIs.",
    demoHint: "/validation",
  },
  {
    id: "confidence",
    label: "Confidence scoring",
    status: "implemented",
    summary: "Per-field confidence; uncertain fields flagged for review.",
    demoHint: "Verification queue filters",
  },
  {
    id: "human",
    label: "Human-assisted verification",
    status: "implemented",
    summary: "Officer review workflow with approve/reject and audit.",
    demoHint: "/verification",
  },
  {
    id: "learning",
    label: "AI learning over time",
    status: "roadmap",
    summary: "Feedback from verified corrections → model improvement (planned phase).",
  },
  {
    id: "gis-lrms",
    label: "LRMS / DILRMP / GIS",
    status: "partial",
    summary: "REST integration layer, Leaflet GIS, database module stubs; PostGIS/GeoServer at deployment.",
    demoHint: "/gis + /api/integrations",
  },
  {
    id: "repository",
    label: "Secure repository & audit",
    status: "implemented",
    summary: "Document store with metadata, JWT RBAC, immutable audit trail.",
    demoHint: "/audit",
  },
  {
    id: "dashboards",
    label: "Monitoring dashboards",
    status: "implemented",
    summary: "Processed count, accuracy/confidence, validation, pending verification, errors, state/district progress.",
    demoHint: "/dashboard/admin",
  },
  {
    id: "apis",
    label: "Government APIs",
    status: "implemented",
    summary: "REST APIs for documents, records, verification, integrations.",
    demoHint: "docs/API_CONTRACTS.md",
  },
  {
    id: "rbac",
    label: "Role-based access control",
    status: "implemented",
    summary: "Admin, data, verification, survey, citizen roles.",
    demoHint: "Login demo accounts",
  },
  {
    id: "cv",
    label: "Computer vision",
    status: "partial",
    summary: "Enhancement, quality/blur/skew via image service; extended scope for map sheets.",
    demoHint: "Processing → image enhancement step",
  },
];

export const DEMO_WALKTHROUGH_STEPS = [
  {
    step: 1,
    role: "Data Officer",
    email: "data@dharohar.gov",
    action: "Upload a land record PDF/image and run the full AI pipeline.",
  },
  {
    step: 2,
    role: "Verification Officer",
    email: "verification@dharohar.gov",
    action: "Review low-confidence fields; approve to create verified record.",
  },
  {
    step: 3,
    role: "Survey Officer",
    email: "survey@dharohar.gov",
    action: "View parcel on GIS map and district digitization progress.",
  },
  {
    step: 4,
    role: "Admin",
    email: "admin@dharohar.gov",
    action: "Command center metrics, requirement coverage, audit log.",
  },
  {
    step: 5,
    role: "Citizen",
    email: "citizen@dharohar.gov",
    action: "Citizen portal — holdings and verified public records.",
  },
] as const;

export function solutionRequirementStats() {
  const implemented = SOLUTION_REQUIREMENTS.filter((r) => r.status === "implemented").length;
  const partial = SOLUTION_REQUIREMENTS.filter((r) => r.status === "partial").length;
  const roadmap = SOLUTION_REQUIREMENTS.filter((r) => r.status === "roadmap").length;
  return { implemented, partial, roadmap, total: SOLUTION_REQUIREMENTS.length };
}

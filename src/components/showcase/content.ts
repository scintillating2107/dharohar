import type { LucideIcon } from "lucide-react";
import { ImageUp, Languages, Braces, RefreshCcw, Gauge, UserCheck, MapPinned, Link2 } from "lucide-react";

export type ShowcaseStepKey = "enhance" | "ocr" | "schema" | "validate" | "confidence" | "verify" | "gis" | "ledger";

export interface ShowcaseStep {
  key: ShowcaseStepKey;
  icon: LucideIcon;
  /** Short label for the step rail */
  short: string;
  title: string;
  tagline: string;
  points: string[];
  tech: string[];
}

/** Narration for each stage of the workflow demo (English source text; translated via t()). */
export const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    key: "enhance",
    icon: ImageUp,
    short: "Enhance",
    title: "Image enhancement",
    tagline: "Old, tilted, stained registers are measured and cleaned before any text is read.",
    points: [
      "Every page is scored for sharpness, ink contrast, brightness, noise and skew.",
      "The tilt is measured from text-line projection profiles and corrected.",
      "Background flattening removes yellowing, stains and uneven light; speckle is filtered.",
      "Only the corrections a page needs are applied — and the before/after scores are stored.",
    ],
    tech: ["sharp / libvips", "Projection-profile deskew", "Flat-field correction", "Median denoise"],
  },
  {
    key: "ocr",
    icon: Languages,
    short: "OCR",
    title: "Multilingual OCR",
    tagline: "Script and orientation are detected, then every word is read with its position and confidence.",
    points: [
      "Orientation & script detection picks the right language model per page.",
      "Tesseract models for 12 Indian languages, always paired with English for mixed records.",
      "Numbers are re-read with a digits-only model, because Indic models often drop a “1”.",
      "Handwritten records are transcribed by Gemini when an API key is configured.",
    ],
    tech: ["Tesseract OSD", "Hindi + English LSTM models", "Digit refinement pass", "Gemini (handwriting)"],
  },
  {
    key: "schema",
    icon: Braces,
    short: "Schema",
    title: "Structuring into the LRMS schema",
    tagline: "Free text becomes a structured land record — every value linked back to where it was read.",
    points: [
      "Bilingual rules recognise Hindi and English labels: खसरा / Khasra, रकबा / Area, खातेदार / Owner.",
      "Values are normalised: Devanagari digits, area units to hectares, dates to ISO format.",
      "Each field keeps its source (rules, AI model, officer) and its box on the scan.",
      "The output is the same record schema served to LRMS / DILRMP through the REST API.",
    ],
    tech: ["Bilingual rule engine", "Gemini structured extraction", "Unit & date normalisation", "REST API /api/v1"],
  },
  {
    key: "validate",
    icon: RefreshCcw,
    short: "Validate",
    title: "Validation cycle",
    tagline: "Every record is checked against rules, master data and history — and re-checked after every edit.",
    points: [
      "Required fields, khasra / khata formats, plausible areas, owner shares and dates.",
      "Village, tehsil and district are matched against LGD master data (Hindi or English spelling).",
      "Duplicate detection across scripts, identical-file detection, and comparison with earlier records of the same plot.",
      "Each officer edit re-runs validation, so the score always reflects the current values.",
    ],
    tech: ["Rule engine", "LGD master data", "Cross-script fuzzy matching", "Version history"],
  },
  {
    key: "confidence",
    icon: Gauge,
    short: "Confidence",
    title: "Confidence scoring & routing",
    tagline: "Each field gets a confidence score that decides who needs to look at what.",
    points: [
      "Field confidence combines the extractor’s certainty with the OCR confidence of the matched words.",
      "Fields below the review threshold are highlighted for the officer.",
      "Invalid or low-confidence records go to the top of the verification queue.",
      "Thresholds are set by the administrator — auto-approval stays off until accuracy is measured.",
    ],
    tech: ["Per-field scoring", "Configurable thresholds", "Priority queue"],
  },
  {
    key: "verify",
    icon: UserCheck,
    short: "Verify",
    title: "Human verification",
    tagline: "An officer checks the flagged fields side by side with the highlighted scan, then approves.",
    points: [
      "Split screen: the scan with the field’s source box next to the editable value.",
      "Maker-checker: the officer who edits a record cannot also approve it (configurable).",
      "Every correction is audited and fed back as a learning example for future extractions.",
      "Approve, reject with reason, or send back for reprocessing.",
    ],
    tech: ["Verification workspace", "Maker-checker", "Learning from corrections"],
  },
  {
    key: "gis",
    icon: MapPinned,
    short: "GIS",
    title: "GIS linking",
    tagline: "The record is placed on the map and its surveyed boundary is cross-checked with the recorded area.",
    points: [
      "Every record is located immediately from LGD master data (village / tehsil / district centre).",
      "Survey officers upload GeoJSON / KML or draw the plot boundary on the map.",
      "The geodesic area of the boundary is compared with the recorded area within a set tolerance.",
      "Parcels are served as GeoJSON to GIS and cadastral systems.",
    ],
    tech: ["Leaflet + Geoman", "Turf geodesic area", "GeoJSON / KML", "OpenStreetMap / Esri"],
  },
  {
    key: "ledger",
    icon: Link2,
    short: "Ledger",
    title: "Blockchain-style integrity layer",
    tagline: "Every action is chained by hashes and every approved record is digitally signed — tampering is detectable by anyone.",
    points: [
      "Append-only audit ledger: each entry stores the SHA-256 of the previous entry, like blocks in a chain.",
      "Approval hashes the record and signs it with the department’s Ed25519 key, anchored to the ledger head.",
      "Anyone can scan the certificate QR to re-verify signature, data and scan — no login needed.",
      "The ledger head can additionally be anchored to a permissioned blockchain network for multi-department trust.",
    ],
    tech: ["SHA-256 hash chain", "Ed25519 signatures", "QR public verification"],
  },
];

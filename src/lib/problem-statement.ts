import { DEMO_RECORD_ID } from "@/lib/record-ids";

/** Ministry / department naming constants for portal chrome. */

export const PS_ID = "26018";

export const PS_TITLE = "Intelligent Land Record Digitization and Validation System";

export const PS_ORGANIZATION = "Ministry of Rural Development";

export const PS_DEPARTMENT = "Department of Land Resources (DoLR)";

export const PS_CATEGORY = "Software";

export const PS_THEME = "Smart Automation";

export const PS_DATASET_LINK =
  "https://drive.google.com/drive/folders/1ibmzWpl_nk7aBhQurs22R9kqh9fPAQwC";

export const PS_BACKGROUND = `Land records form the backbone of land administration, property ownership, taxation, land acquisition, dispute resolution, and infrastructure planning. Across India, a significant portion of historical land records continues to exist as handwritten registers, scanned documents, maps, cadastral records, and legacy PDF files maintained at various administrative levels.

An intelligent digitization system can significantly improve data quality while accelerating the modernization of India's land administration ecosystem.`;

export const PS_STUDY_DESCRIPTION = `Develop an AI-powered Intelligent Land Record Digitization and Validation System capable of automatically extracting structured information from scanned land records, handwritten documents, maps, and legacy PDF files.

The solution utilizes advanced OCR, Computer Vision, and Natural Language Processing to recognize printed and handwritten text in multiple Indian languages. Extracted information is classified into predefined fields — landowner details, survey number, khasra, khata, plot area, village, tehsil, district, land classification, ownership, mutation, and registration information.

The platform provides document upload, automated processing, manual verification where required, audit tracking, and integration pathways for LRMS, DILRMP, GIS platforms, and other government databases.`;

export const PS_PROBLEMS = [
  "Poor image quality, inconsistent formats, faded text, and damaged pages in legacy records.",
  "Multiple regional languages and handwritten annotations slowing manual digitization.",
  "Time-consuming, error-prone manual data entry increasing operational cost.",
  "Lack of standardized digital records affecting ownership verification and citizen services.",
  "Difficulty integrating legacy records with modern land information systems and DILRMP goals.",
];

export const SCOPE_OF_STUDY_ROWS: { area: string; relevance: string }[] = [
  {
    area: "Artificial Intelligence (AI)",
    relevance: "Orchestrates extraction, validation scoring, and routing to human review.",
  },
  {
    area: "Optical Character Recognition (OCR)",
    relevance: "Printed and handwritten text from scans and PDFs; multilingual Indic support.",
  },
  {
    area: "Computer Vision (CV)",
    relevance: "Image enhancement, quality checks, skew/blur detection before OCR.",
  },
  {
    area: "Natural Language Processing (NLP)",
    relevance: "Semantic field extraction and classification into LRMS field schema.",
  },
  {
    area: "Machine Learning (ML)",
    relevance: "Confidence scoring, duplicate similarity, and feedback loop for accuracy (roadmap).",
  },
];

export const DEMO_CAPABILITY_LINKS = [
  { label: "Multilingual OCR & NLP", href: `/records/${DEMO_RECORD_ID}?tab=ocr`, ps: "Items 7–8" },
  { label: "Field classification", href: `/records/${DEMO_RECORD_ID}?tab=extracted`, ps: "Item 9" },
  { label: "Validation & duplicates", href: "/validation?duplicates=1", ps: "Item 10" },
  { label: "Confidence & human review", href: "/verification", ps: "Items 11–12" },
  { label: "LRMS / DILRMP / GIS", href: "/gis", ps: "Item 14" },
  { label: "Repository & audit trail", href: "/audit", ps: "Item 15" },
  { label: "Dashboards & progress", href: "/dashboard/overview", ps: "Monitoring" },
  { label: "Government APIs", href: "/about", ps: "APIs" },
  { label: "Role-based access", href: "/users", ps: "RBAC" },
  { label: "End-to-end demo", href: "/demo/workflow", ps: "Full workflow" },
] as const;

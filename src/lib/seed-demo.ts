import type {
  AuditEvent,
  Document,
  LandRecord,
  Parcel,
  VerificationTask,
} from "@/types";
import { PROCESSING_STEPS } from "@/lib/config";
import { mockExtractionResult, mockOCRResult, mockValidationResult } from "@/mocks/data";
import { DEMO_DOCUMENT_ID, DEMO_RECORD_ID } from "@/lib/record-ids";
import { generateId } from "@/lib/utils";

export interface PersistedStore {
  users: import("@/types").User[];
  passwordHashes: Record<string, string>;
  documents: Document[];
  records: LandRecord[];
  verificationTasks: VerificationTask[];
  auditEvents: AuditEvent[];
  parcels: Parcel[];
}

function demoValidation() {
  const v = mockValidationResult(DEMO_DOCUMENT_ID);
  return {
    ...v,
    warnings: [
      {
        field: "area",
        type: "HISTORICAL_MISMATCH",
        message: "Area differs from historical khatauni",
        current_value: "1.80 ha",
        previous_value: "2.40 ha",
      },
    ],
    duplicate: { detected: true, similarity: 0.93, record_id: "LR-1998-000412" },
  };
}

function demoFields() {
  const ext = mockExtractionResult(DEMO_DOCUMENT_ID);
  return {
    ...ext.fields,
    area: { value: "1.80", unit: "ha", confidence: 0.68, needsReview: true },
  };
}

export function buildDemoSeed(now: string): {
  document: Document;
  record: LandRecord;
  task: VerificationTask;
  parcel: Parcel;
  audit: AuditEvent[];
} {
  const ocr = mockOCRResult(DEMO_DOCUMENT_ID);
  ocr.pages[0].regions = ocr.pages[0].regions.map((r) =>
    r.fieldKey === "area" ? { ...r, text: "1.80", confidence: 0.68 } : r
  );
  ocr.pages[0].text = ocr.pages[0].text.replace("0.2450", "1.80");

  const record: LandRecord = {
    record_id: DEMO_RECORD_ID,
    document_id: DEMO_DOCUMENT_ID,
    owner_name: "राम सिंह",
    father_name: "मोहन सिंह",
    khasra_number: "235/1",
    khata_number: "124",
    area: 1.8,
    area_unit: "ha",
    village: "चिनहट",
    tehsil: "Sadar",
    district: "Lucknow",
    state: "Uttar Pradesh",
    status: "VERIFICATION_REQUIRED",
    fields: demoFields(),
    validation: demoValidation(),
    ocr,
    averageConfidence: 0.91,
    createdAt: now,
    updatedAt: now,
    record_year: 2026,
    mutation_number: "M-2024-123",
  };

  const completedSteps = PROCESSING_STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    status: i < 7 ? ("completed" as const) : ("pending" as const),
    completedAt: i < 7 ? now : undefined,
  }));

  const document: Document = {
    id: DEMO_DOCUMENT_ID,
    name: "UP_LandRecord_1998.pdf",
    fileType: "application/pdf",
    fileSize: 2_400_000,
    pageCount: 3,
    uploadedBy: "U003",
    uploadedByName: "Priya Sharma",
    uploadedAt: now,
    status: "VERIFICATION_REQUIRED",
    steps: completedSteps,
    pages: [1, 2, 3].map((p) => ({
      page: p,
      imageUrl: `/samples/land-record-page-${((p - 1) % 3) + 1}.svg`,
      processedImageUrl: `/samples/land-record-page-${((p - 1) % 3) + 1}.svg`,
      qualityScore: 84,
      skewAngle: 0.4,
    })),
    district: "Lucknow",
    state: "Uttar Pradesh",
    recordId: DEMO_RECORD_ID,
    tehsil: "Sadar",
    village: "चिनहट",
    recordYear: "1998",
    recordType: "Khatauni / Record of Rights",
    sourceOffice: "Revenue Department",
    language: "hi",
  };

  const task: VerificationTask = {
    id: "VT-DEMO-001",
    recordId: DEMO_RECORD_ID,
    documentId: DEMO_DOCUMENT_ID,
    ownerName: record.owner_name,
    village: record.village,
    district: record.district,
    khasraNumber: record.khasra_number,
    confidence: record.averageConfidence,
    validationStatus: "REVIEW_REQUIRED",
    priority: "HIGH",
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  const parcel: Parcel = {
    parcel_id: "P-DEMO-235-1",
    record_id: DEMO_RECORD_ID,
    khasra_number: "235/1",
    owner_name: "Ram Singh",
    area: 1.8,
    area_unit: "ha",
    village: "Chinhat",
    district: "Lucknow",
    status: "VERIFICATION_REQUIRED",
    center: { lat: 26.8467, lng: 80.9462 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [80.944, 26.845],
          [80.948, 26.845],
          [80.948, 26.848],
          [80.944, 26.848],
          [80.944, 26.845],
        ],
      ],
    },
  };

  const audit: AuditEvent[] = [
    {
      id: generateId("AE"),
      documentId: DEMO_DOCUMENT_ID,
      recordId: DEMO_RECORD_ID,
      timestamp: now,
      actor: "System",
      actorName: "System",
      action: "DOCUMENT_UPLOADED",
      details: "UP_LandRecord_1998.pdf uploaded",
    },
    {
      id: generateId("AE"),
      documentId: DEMO_DOCUMENT_ID,
      recordId: DEMO_RECORD_ID,
      timestamp: now,
      actor: "System",
      actorName: "System",
      action: "OCR_COMPLETED",
      details: "Confidence: 94.2%",
    },
    {
      id: generateId("AE"),
      documentId: DEMO_DOCUMENT_ID,
      recordId: DEMO_RECORD_ID,
      timestamp: now,
      actor: "System",
      actorName: "System",
      action: "EXTRACTION_COMPLETED",
    },
    {
      id: generateId("AE"),
      documentId: DEMO_DOCUMENT_ID,
      recordId: DEMO_RECORD_ID,
      timestamp: now,
      actor: "System",
      actorName: "System",
      action: "VALIDATION_COMPLETED",
      details: "Score: 87%",
    },
  ];

  return { document, record, task, parcel, audit };
}

export function mergeDemoSeed(data: PersistedStore): PersistedStore {
  if (data.records.some((r) => r.record_id === DEMO_RECORD_ID)) {
    return data;
  }
  const now = new Date().toISOString();
  const { document, record, task, parcel, audit } = buildDemoSeed(now);

  if (!data.documents.some((d) => d.id === DEMO_DOCUMENT_ID)) {
    data.documents.unshift(document);
  }
  data.records.unshift(record);
  if (!data.verificationTasks.some((t) => t.recordId === DEMO_RECORD_ID)) {
    data.verificationTasks.unshift(task);
  }
  if (!data.parcels.some((p) => p.record_id === DEMO_RECORD_ID)) {
    data.parcels.push(parcel);
  }
  for (const e of audit) {
    if (!data.auditEvents.some((x) => x.action === e.action && x.recordId === DEMO_RECORD_ID)) {
      data.auditEvents.unshift(e);
    }
  }
  return data;
}

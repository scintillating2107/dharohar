import type {
  LandRecord,
  ImageProcessingResult,
  OCRResult,
  ExtractionResult,
  ValidationResult,
  ProcessingStatus,
  ProcessingStep,
  VerificationTask,
} from "@/types";
import { store, createInitialSteps, generateId } from "./store";
import { allocateRecordId } from "./record-ids";
import { readStoredFile } from "./file-storage";
import { enrichParcel } from "./gis-utils";
import {
  processImages,
  runOCR,
  extractFields,
  validateRecord,
  IntegrationError,
} from "./integrations";

const STEP_STATUS_MAP: Record<string, ProcessingStatus> = {
  upload: "UPLOADED",
  pdf_processing: "PROCESSING",
  image_enhancement: "IMAGE_PROCESSING",
  language_detection: "OCR_PROCESSING",
  ocr: "OCR_PROCESSING",
  field_extraction: "EXTRACTION_PROCESSING",
  validation: "VALIDATION_PROCESSING",
  human_verification: "VERIFICATION_REQUIRED",
  final_storage: "VERIFIED",
};

function updateStep(
  steps: ProcessingStep[],
  stepKey: string,
  status: ProcessingStep["status"],
  error?: string
): ProcessingStep[] {
  const now = new Date().toISOString();
  return steps.map((step) => {
    if (step.key === stepKey) {
      return {
        ...step,
        status,
        startedAt: status === "in_progress" ? now : step.startedAt,
        completedAt: status === "completed" ? now : step.completedAt,
        error,
      };
    }
    return step;
  });
}

function avgConfidence(fields: Record<string, { confidence: number }>): number {
  const values = Object.values(fields).map((f) => f.confidence);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function runStep(
  documentId: string,
  stepKey: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const doc = store.getDocument(documentId);
  if (!doc) return false;

  let currentSteps = doc.steps;
  currentSteps = updateStep(currentSteps, stepKey, "in_progress");
  store.updateDocument(documentId, {
    status: STEP_STATUS_MAP[stepKey],
    steps: currentSteps,
  });

  try {
    await fn();
    currentSteps = updateStep(currentSteps, stepKey, "completed");
    store.updateDocument(documentId, {
      status: STEP_STATUS_MAP[stepKey],
      steps: currentSteps,
    });
    return true;
  } catch (err) {
    const message =
      err instanceof IntegrationError
        ? err.message
        : "Processing step failed";
    currentSteps = updateStep(currentSteps, stepKey, "failed", message);
    store.updateDocument(documentId, {
      status: "FAILED",
      steps: currentSteps,
    });
    store.addAuditEvent({
      id: generateId("AE"),
      documentId,
      timestamp: new Date().toISOString(),
      actor: "System",
      actorName: "System",
      action: "PROCESSING_STARTED",
      details: `Failed at ${stepKey}: ${message}`,
    });
    return false;
  }
}

export async function runProcessingPipeline(documentId: string): Promise<void> {
  const doc = store.getDocument(documentId);
  if (!doc) return;

  const steps = createInitialSteps();
  steps[0] = { ...steps[0], status: "completed", completedAt: new Date().toISOString() };

  store.updateDocument(documentId, {
    status: "PROCESSING",
    steps,
  });

  store.addAuditEvent({
    id: generateId("AE"),
    documentId,
    timestamp: new Date().toISOString(),
    actor: "System",
    actorName: "System",
    action: "PROCESSING_STARTED",
  });

  // Step: PDF processing — validate stored upload
  const pdfOk = await runStep(documentId, "pdf_processing", async () => {
    const stored = await readStoredFile(documentId);
    if (!stored) {
      throw new IntegrationError("Uploaded file missing from storage", "Storage", false);
    }
  });
  if (!pdfOk) return;

  // Step: Image enhancement — Member 2
  let imageResult: ImageProcessingResult | undefined;
  const imageOk = await runStep(documentId, "image_enhancement", async () => {
    imageResult = await processImages(documentId, doc.pageCount, doc.name);
  });
  if (!imageOk) return;

  // Step: Language detection (based on OCR prep)
  const langOk = await runStep(documentId, "language_detection", async () => {
    // Local pipeline defaults to Hindi/English mixed land records
  });
  if (!langOk) return;

  // Step: OCR — Member 3
  let ocrResult: OCRResult | undefined;
  const ocrOk = await runStep(documentId, "ocr", async () => {
    ocrResult = await runOCR(
      documentId,
      imageResult?.pages.map((p) => p.processed_image_url)
    );
    store.addAuditEvent({
      id: generateId("AE"),
      documentId,
      timestamp: new Date().toISOString(),
      actor: "System",
      actorName: "System",
      action: "OCR_COMPLETED",
    });
  });
  if (!ocrOk) return;

  // Step: Field extraction — Member 4
  let extraction: ExtractionResult | undefined;
  const extractOk = await runStep(documentId, "field_extraction", async () => {
    extraction = await extractFields(documentId, ocrResult);
    store.addAuditEvent({
      id: generateId("AE"),
      documentId,
      timestamp: new Date().toISOString(),
      actor: "System",
      actorName: "System",
      action: "EXTRACTION_COMPLETED",
    });
  });
  if (!extractOk || !extraction) return;

  // Step: Validation — Member 5
  let validation: ValidationResult | undefined;
  const validateOk = await runStep(documentId, "validation", async () => {
    validation = await validateRecord(documentId, extraction);
    store.addAuditEvent({
      id: generateId("AE"),
      documentId,
      timestamp: new Date().toISOString(),
      actor: "System",
      actorName: "System",
      action: "VALIDATION_COMPLETED",
      details: `Score: ${validation?.validation_score}, Status: ${validation?.validation_status}`,
    });
  });
  if (!validateOk || !validation) return;

  const docMeta = store.getDocument(documentId);
  const recordId = allocateRecordId(store.records);
  const recordYear = docMeta?.recordYear ? parseInt(docMeta.recordYear, 10) : new Date().getFullYear();
  const record: LandRecord = {
    record_id: recordId,
    document_id: documentId,
    owner_name: extraction.fields.owner_name?.value || "",
    father_name: extraction.fields.father_name?.value,
    khasra_number: extraction.fields.khasra_number?.value || "",
    khata_number: extraction.fields.khata_number?.value || "",
    area: parseFloat(extraction.fields.area?.value || "0"),
    area_unit: extraction.fields.area?.unit || "hectare",
    village: extraction.fields.village?.value || "",
    tehsil: extraction.fields.tehsil?.value || "",
    district: extraction.fields.district?.value || "",
    state: extraction.fields.state?.value || "",
    status: "VERIFICATION_REQUIRED",
    fields: extraction.fields,
    validation,
    ocr: ocrResult,
    averageConfidence: avgConfidence(extraction.fields),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    registration_number: extraction.fields.registration_number?.value,
    mutation_number: extraction.fields.mutation_number?.value,
    mutation_date: extraction.fields.mutation_date?.value,
    record_year: Number.isNaN(recordYear) ? undefined : recordYear,
  };

  store.addRecord(record);

  const verificationTask: VerificationTask = {
    id: generateId("VT"),
    recordId,
    documentId,
    ownerName: record.owner_name,
    village: record.village,
    district: record.district,
    khasraNumber: record.khasra_number,
    confidence: record.averageConfidence,
    validationStatus: validation.validation_status,
    priority: record.averageConfidence < 0.8 ? "HIGH" : "MEDIUM",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.addVerificationTask(verificationTask);

  const pages = doc.pages.map((p, i) => ({
    ...p,
    processedImageUrl: imageResult?.pages[i]?.processed_image_url,
    qualityScore: imageResult?.pages[i]?.quality_score,
  }));

  let finalSteps = store.getDocument(documentId)?.steps || steps;
  finalSteps = updateStep(finalSteps, "human_verification", "in_progress");

  store.updateDocument(documentId, {
    status: "VERIFICATION_REQUIRED",
    steps: finalSteps,
    recordId,
    pages,
    district: record.district,
    state: record.state,
  });

  store.addParcel(
    enrichParcel({
      parcel_id: generateId("P"),
      record_id: recordId,
      khasra_number: record.khasra_number,
      owner_name: record.owner_name,
      area: record.area,
      area_unit: record.area_unit,
      village: record.village,
      district: record.district,
      status: "VERIFICATION_REQUIRED",
    })
  );
}

export async function retryProcessingFromStep(
  documentId: string,
  fromStep?: string
): Promise<void> {
  const doc = store.getDocument(documentId);
  if (!doc) return;

  const resetSteps = createInitialSteps().map((s, i) =>
    i === 0
      ? { ...s, status: "completed" as const, completedAt: new Date().toISOString() }
      : s
  );

  store.updateDocument(documentId, {
    status: "UPLOADED",
    steps: resetSteps,
    recordId: undefined,
  });

  await runProcessingPipeline(documentId);
}


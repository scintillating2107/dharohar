import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import { retryProcessingFromStep } from "@/lib/processing-pipeline";
import { apiSuccess, notFound, apiError } from "@/lib/api-utils";
import type { OCRResult, ExtractionResult, ValidationResult, ImageProcessingResult } from "@/types";

const WEBHOOK_KEY = process.env.INTEGRATION_SERVICE_KEY || "dharohar-local-dev-key";

function authorize(request: NextRequest): boolean {
  return request.headers.get("x-integration-key") === WEBHOOK_KEY;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return apiError("Invalid integration key", 401);
  }

  try {
    const body = await request.json();
    const { document_id, type, result } = body;

    if (!document_id || !type || !result) {
      return apiError("document_id, type, and result are required");
    }

    const doc = store.getDocument(document_id);
    if (!doc) return notFound("Document not found");

    const record = store.records.find((r) => r.document_id === document_id);

    switch (type) {
      case "image_processing": {
        const imgResult = result as ImageProcessingResult;
        const pages = doc.pages.map((p, i) => ({
          ...p,
          processedImageUrl: imgResult.pages[i]?.processed_image_url,
          qualityScore: imgResult.pages[i]?.quality_score,
        }));
        store.updateDocument(document_id, { pages, status: "IMAGE_PROCESSING" });
        break;
      }
      case "ocr": {
        if (record) {
          store.updateRecord(record.record_id, { ocr: result as OCRResult });
        }
        store.addAuditEvent({
          id: generateId("AE"),
          documentId: document_id,
          recordId: record?.record_id,
          timestamp: new Date().toISOString(),
          actor: "System",
          actorName: "OCR Service (Member 3)",
          action: "OCR_COMPLETED",
        });
        break;
      }
      case "extraction": {
        const extraction = result as ExtractionResult;
        if (record) {
          store.updateRecord(record.record_id, {
            fields: extraction.fields,
            owner_name: extraction.fields.owner_name?.value || record.owner_name,
            khasra_number: extraction.fields.khasra_number?.value || record.khasra_number,
          });
        }
        store.addAuditEvent({
          id: generateId("AE"),
          documentId: document_id,
          recordId: record?.record_id,
          timestamp: new Date().toISOString(),
          actor: "System",
          actorName: "Extraction Service (Member 4)",
          action: "EXTRACTION_COMPLETED",
        });
        break;
      }
      case "validation": {
        const validation = result as ValidationResult;
        if (record) {
          store.updateRecord(record.record_id, { validation });
        }
        store.addAuditEvent({
          id: generateId("AE"),
          documentId: document_id,
          recordId: record?.record_id,
          timestamp: new Date().toISOString(),
          actor: "System",
          actorName: "Validation Service (Member 5)",
          action: "VALIDATION_COMPLETED",
          details: `Score: ${validation.validation_score}`,
        });
        break;
      }
      case "reprocess": {
        retryProcessingFromStep(document_id).catch(console.error);
        break;
      }
      default:
        return apiError(`Unknown webhook type: ${type}`);
    }

    return apiSuccess({ received: true, type, document_id });
  } catch {
    return apiError("Webhook processing failed", 500);
  }
}

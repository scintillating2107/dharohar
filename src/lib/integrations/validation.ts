import type { ExtractionResult, ValidationResult } from "@/types";
import { mockValidationResult } from "@/mocks/data";
import { validateRecordLocal } from "@/lib/services/local";
import { callExternal, INTEGRATION_URLS, isMockMode, IntegrationError } from "./client";

export async function validateRecord(
  documentId: string,
  extraction?: ExtractionResult
): Promise<ValidationResult> {
  if (isMockMode()) {
    await delay(600);
    return mockValidationResult(documentId);
  }

  if (INTEGRATION_URLS.validation) {
    try {
      return await callExternal<ValidationResult>(
        "Validation (Member 5)",
        `${INTEGRATION_URLS.validation}/validate`,
        { document_id: documentId, fields: extraction?.fields }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Member 5 unavailable, using local validation:", msg);
    }
  }

  return validateRecordLocal(documentId, extraction);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

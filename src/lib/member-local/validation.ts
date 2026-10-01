import type { ExtractionResult, ValidationResult } from "@/types";
import { store } from "@/lib/store";

const REQUIRED_FIELDS = ["owner_name", "khasra_number", "village", "district", "state"];
const KHASRA_REGEX = /^\d+\/\d+$/;

export async function validateRecordLocal(
  documentId: string,
  extraction?: ExtractionResult
): Promise<ValidationResult> {
  const fields = extraction?.fields || {};
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];
  const passed_checks: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!fields[field]?.value) {
      errors.push({ field, type: "MISSING_FIELD", message: `${field.replace(/_/g, " ")} is required` });
    } else {
      passed_checks.push(`${field.replace(/_/g, " ")} present`);
    }
  }

  const khasra = fields.khasra_number?.value;
  const village = fields.village?.value;
  const areaValue = fields.area?.value;

  if (khasra) {
    if (KHASRA_REGEX.test(khasra)) passed_checks.push("Khasra format valid");
    else {
      warnings.push({
        field: "khasra_number",
        type: "FORMAT_WARNING",
        message: "Khasra number format may be invalid",
        current_value: khasra,
      });
    }
  }

  const duplicate = store.records.find(
    (record) =>
      record.document_id !== documentId &&
      record.khasra_number === khasra &&
      record.village === village
  );

  if (duplicate) {
    warnings.push({
      field: "khasra_number",
      type: "DUPLICATE_CANDIDATE",
      message: "A record with the same khasra and village already exists",
      current_value: khasra,
      previous_value: duplicate.record_id,
    });
  } else if (khasra) {
    passed_checks.push("No duplicate detected");
  }

  const historical = store.records.find(
    (record) =>
      record.document_id !== documentId &&
      record.khasra_number === khasra &&
      record.village === village &&
      record.area &&
      areaValue &&
      Math.abs(record.area - parseFloat(areaValue)) > 0.001
  );

  if (historical && areaValue) {
    warnings.push({
      field: "area",
      type: "HISTORICAL_MISMATCH",
      message: "Area differs from previous record with same khasra/village",
      current_value: `${areaValue} ${fields.area?.unit || "hectare"}`,
      previous_value: `${historical.area} ${historical.area_unit || "hectare"}`,
    });
  } else if (historical === undefined && areaValue) {
    passed_checks.push("Historical records consistent");
  }

  for (const [key, value] of Object.entries(fields)) {
    if (value.confidence < 0.8) {
      warnings.push({
        field: key,
        type: "LOW_CONFIDENCE",
        message: `${key.replace(/_/g, " ")} extracted with low confidence`,
        current_value: value.value,
      });
    }
  }

  const validation_score = Math.max(0, 100 - errors.length * 20 - warnings.length * 8);
  let validation_status: ValidationResult["validation_status"] = "VALID";
  if (errors.length > 0) validation_status = "INVALID";
  else if (warnings.length > 0) validation_status = "REVIEW_REQUIRED";

  return {
    document_id: documentId,
    validation_status,
    validation_score,
    errors,
    warnings,
    duplicate: {
      detected: Boolean(duplicate),
      similarity: duplicate ? 0.85 : 0,
      record_id: duplicate?.record_id,
    },
    passed_checks,
  };
}

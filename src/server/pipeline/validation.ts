import type {
  ExtractedFieldValue,
  Owner,
  SystemSettings,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from "@/types";
import type { MasterRow } from "@/server/master";
import { hasCoverage, matchPlace } from "@/server/master";
import {
  isValidKhasra,
  nameSimilarity,
  normalizeAreaUnit,
  normalizeKhasra,
  parseIndianDate,
  placeKey,
  toHectares,
} from "./normalize";

export interface ExistingRecord {
  id: string;
  documentId: string;
  status: string;
  ownerName: string;
  khasraNormalized: string;
  khataNumber: string;
  village: string;
  district: string;
  areaHectares: number | null;
  area: number;
  areaUnit: string;
  mutationNumber: string | null;
  verifiedAt: string | null;
}

export interface ValidationInput {
  documentId: string;
  documentSha256?: string | null;
  duplicateDocumentId?: string | null;
  fields: Record<string, ExtractedFieldValue>;
  owners: Owner[];
  canonical: { state: string; district: string; tehsil: string; village: string };
  recordYear?: number | null;
  sameKhasraRecords: ExistingRecord[];
  master: MasterRow[];
  settings: Pick<SystemSettings, "reviewThreshold">;
  now?: Date;
}

const REQUIRED = ["owner_name", "khasra_number", "village", "district", "state"] as const;

const WARNING_PENALTY: Record<string, number> = {
  DUPLICATE_DOCUMENT: 25,
  DUPLICATE_CANDIDATE: 15,
  HISTORICAL_MISMATCH: 10,
  OWNERSHIP_CHANGE: 4,
  LOCATION_MISMATCH: 8,
  LOCATION_UNVERIFIED: 2,
  FORMAT_WARNING: 8,
  AREA_IMPLAUSIBLE: 10,
  UNKNOWN_UNIT: 6,
  SHARE_MISMATCH: 8,
  DATE_INVALID: 6,
  NAME_CONFLICT: 6,
  LOW_CONFIDENCE: 4,
  METADATA_ONLY: 3,
};

/** Warning types that are informational and don't force human review on their own. */
const INFORMATIONAL = new Set(["LOCATION_UNVERIFIED"]);

function label(field: string): string {
  return field.replace(/_/g, " ");
}

export function validateCandidate(input: ValidationInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const passed: string[] = [];
  const f = input.fields;
  const now = input.now ?? new Date();

  // 1. Required fields
  for (const key of REQUIRED) {
    if (!f[key]?.value?.trim()) {
      errors.push({ field: key, type: "MISSING_FIELD", message: `${label(key)} is required` });
    } else passed.push(`${label(key)} present`);
  }

  // 2. Formats
  const khasra = f.khasra_number?.value ? normalizeKhasra(f.khasra_number.value) : "";
  if (khasra) {
    if (isValidKhasra(khasra)) passed.push("Khasra number format valid");
    else
      warnings.push({
        field: "khasra_number",
        type: "FORMAT_WARNING",
        message: "Khasra number does not look like a plot number (e.g. 235, 235/1, 235क)",
        current_value: f.khasra_number!.value,
      });
  }
  if (f.khata_number?.value) {
    if (/^\d{1,8}(\/\d{1,4})?$/.test(f.khata_number.value.trim())) passed.push("Khata number format valid");
    else
      warnings.push({
        field: "khata_number",
        type: "FORMAT_WARNING",
        message: "Khata number should be numeric",
        current_value: f.khata_number.value,
      });
  }

  // 3. Area
  let areaHa: number | null = null;
  if (f.area?.value) {
    const value = parseFloat(f.area.value);
    const unit = normalizeAreaUnit(f.area.unit ?? "hectare");
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({ field: "area", type: "INVALID_AREA", message: "Area must be a positive number" });
    } else if (!unit) {
      warnings.push({
        field: "area",
        type: "UNKNOWN_UNIT",
        message: `Area unit "${f.area.unit}" is not a recognised land measure`,
        current_value: `${f.area.value} ${f.area.unit ?? ""}`.trim(),
      });
    } else {
      areaHa = toHectares(value, unit, input.canonical.state);
      if (areaHa !== null && (areaHa < 0.0005 || areaHa > 500)) {
        warnings.push({
          field: "area",
          type: "AREA_IMPLAUSIBLE",
          message: `Area of ${areaHa.toFixed(4)} ha is outside the plausible range for a single plot`,
          current_value: `${f.area.value} ${unit}`,
        });
      } else passed.push(`Area ${areaHa?.toFixed(4)} ha within plausible range`);
    }
  }

  // 4. Dates
  if (f.mutation_date?.value) {
    const iso = parseIndianDate(f.mutation_date.value);
    const year = iso ? Number(iso.slice(0, 4)) : NaN;
    if (!iso || year < 1850 || new Date(iso) > now) {
      warnings.push({
        field: "mutation_date",
        type: "DATE_INVALID",
        message: "Mutation date is not a valid past date",
        current_value: f.mutation_date.value,
      });
    } else if (input.recordYear && year > input.recordYear + 1) {
      warnings.push({
        field: "mutation_date",
        type: "DATE_INVALID",
        message: `Mutation date ${iso} is after the declared record year ${input.recordYear}`,
        current_value: iso,
      });
    } else passed.push("Mutation date valid");
  }

  // 5. Ownership
  const shares = input.owners.map((o) => o.share).filter((s): s is number => typeof s === "number");
  if (shares.length > 0) {
    const total = shares.reduce((a, b) => a + b, 0);
    const asFraction = total > 1.5 ? total / 100 : total;
    if (shares.length !== input.owners.length || Math.abs(asFraction - 1) > 0.02) {
      warnings.push({
        field: "owners",
        type: "SHARE_MISMATCH",
        message: `Owner shares add up to ${(asFraction * 100).toFixed(1)}% instead of 100%`,
      });
    } else passed.push("Owner shares total 100%");
  }
  if (f.owner_name?.value && f.father_name?.value && nameSimilarity(f.owner_name.value, f.father_name.value) > 0.95) {
    warnings.push({
      field: "father_name",
      type: "NAME_CONFLICT",
      message: "Father's name is identical to the owner's name",
      current_value: f.father_name.value,
    });
  }

  // 6. Master data (state / district / tehsil / village)
  const checkPlace = (
    field: "state" | "district" | "tehsil" | "village",
    scope: { state?: string; district?: string }
  ) => {
    const value = f[field]?.value;
    if (!value) return;
    if (!hasCoverage(input.master, field, scope)) {
      warnings.push({
        field,
        type: "LOCATION_UNVERIFIED",
        message: `No ${field} master data loaded for ${scope.district || scope.state || "this area"} — not verified`,
        current_value: value,
      });
      return;
    }
    const match = matchPlace(input.master, field, value, scope);
    if (match && match.similarity >= 0.85) passed.push(`${label(field)} "${value}" matches master record ${match.name}`);
    else
      warnings.push({
        field,
        type: "LOCATION_MISMATCH",
        message: `${label(field)} "${value}" not found in master data${match ? ` (closest: ${match.name})` : ""}`,
        current_value: value,
        previous_value: match?.name,
      });
  };
  checkPlace("state", {});
  checkPlace("district", { state: input.canonical.state });
  checkPlace("tehsil", { state: input.canonical.state, district: input.canonical.district });
  checkPlace("village", { state: input.canonical.state, district: input.canonical.district });

  // 7. Duplicates and history
  let duplicate: ValidationResult["duplicate"] = { detected: false, similarity: 0 };
  if (input.duplicateDocumentId) {
    warnings.push({
      field: "document",
      type: "DUPLICATE_DOCUMENT",
      message: "The same file (identical SHA-256) was uploaded before",
      related_record_id: input.duplicateDocumentId,
      previous_value: input.duplicateDocumentId,
    });
  }
  const villageKey = placeKey(input.canonical.village || f.village?.value || "");
  for (const other of input.sameKhasraRecords) {
    if (other.documentId === input.documentId || other.khasraNormalized !== khasra) continue;
    const sameVillage = villageKey && placeKey(other.village) === villageKey ? 1 : nameSimilarity(other.village, input.canonical.village);
    if (sameVillage < 0.85) continue;
    const ownerSim = f.owner_name?.value ? nameSimilarity(other.ownerName, f.owner_name.value) : 0;
    const khataSame = f.khata_number?.value && other.khataNumber === f.khata_number.value.trim() ? 1 : 0;
    const similarity = 0.4 + 0.25 * sameVillage + 0.25 * ownerSim + 0.1 * khataSame;

    if (similarity >= 0.85 && similarity > duplicate.similarity) {
      duplicate = { detected: true, similarity: Math.round(similarity * 100) / 100, record_id: other.id };
    }

    if (other.status === "VERIFIED") {
      if (areaHa !== null && other.areaHectares !== null && Math.abs(areaHa - other.areaHectares) > Math.max(0.0005, other.areaHectares * 0.01)) {
        warnings.push({
          field: "area",
          type: "HISTORICAL_MISMATCH",
          message: `Area differs from verified record ${other.id} for the same khasra`,
          current_value: `${areaHa.toFixed(4)} ha`,
          previous_value: `${other.areaHectares.toFixed(4)} ha`,
          related_record_id: other.id,
        });
      }
      if (ownerSim < 0.85 && f.owner_name?.value) {
        warnings.push({
          field: "owner_name",
          type: "OWNERSHIP_CHANGE",
          message: f.mutation_number?.value
            ? `Owner differs from verified record ${other.id}; mutation ${f.mutation_number.value} should explain the transfer`
            : `Owner differs from verified record ${other.id} and no mutation reference was found`,
          current_value: f.owner_name.value,
          previous_value: other.ownerName,
          related_record_id: other.id,
        });
      }
    }
  }
  if (duplicate.detected) {
    warnings.push({
      field: "khasra_number",
      type: "DUPLICATE_CANDIDATE",
      message: `Likely duplicate of record ${duplicate.record_id} (${Math.round(duplicate.similarity * 100)}% match on khasra, village, owner, khata)`,
      current_value: khasra,
      previous_value: duplicate.record_id,
      related_record_id: duplicate.record_id,
    });
  } else if (khasra) passed.push("No duplicate record found");

  // 8. Confidence
  for (const [key, value] of Object.entries(f)) {
    if (value.source === "metadata") {
      warnings.push({
        field: key,
        type: "METADATA_ONLY",
        message: `${label(key)} was not found in the document (upload metadata used)`,
        current_value: value.value,
      });
    } else if (value.confidence < input.settings.reviewThreshold) {
      warnings.push({
        field: key,
        type: "LOW_CONFIDENCE",
        message: `${label(key)} extracted with ${Math.round(value.confidence * 100)}% confidence`,
        current_value: value.value,
      });
    }
  }

  const penalty =
    errors.length * 20 + warnings.reduce((sum, w) => sum + (WARNING_PENALTY[w.type] ?? 5), 0);
  const validation_score = Math.max(0, 100 - penalty);
  const actionable = warnings.filter((w) => !INFORMATIONAL.has(w.type));
  const validation_status: ValidationResult["validation_status"] =
    errors.length > 0 ? "INVALID" : actionable.length > 0 ? "REVIEW_REQUIRED" : "VALID";

  return {
    document_id: input.documentId,
    validation_status,
    validation_score,
    errors,
    warnings,
    duplicate,
    passed_checks: passed,
    validated_at: now.toISOString(),
  };
}

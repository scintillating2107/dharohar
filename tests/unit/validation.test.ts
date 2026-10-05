import { describe, expect, it } from "vitest";
import { validateCandidate, type ExistingRecord } from "@/server/pipeline/validation";
import { canonicalizeLocation, type MasterRow } from "@/server/master";
import { baselineMasterData } from "@/server/db/master-data";
import type { ExtractedFieldValue } from "@/types";

const master: MasterRow[] = baselineMasterData().map((r, i) => ({
  id: i + 1,
  level: r.level,
  state: r.state,
  district: r.district,
  tehsil: r.tehsil ?? null,
  village: r.village ?? null,
  nameHi: r.nameHi ?? null,
  lgdCode: null,
  lat: r.lat ?? null,
  lng: r.lng ?? null,
}));

const f = (value: string, extra: Partial<ExtractedFieldValue> = {}): ExtractedFieldValue => ({
  value,
  confidence: 0.95,
  source: "gemini",
  ...extra,
});

const baseFields = {
  owner_name: f("राम सिंह"),
  father_name: f("मोहन सिंह"),
  khasra_number: f("235/1"),
  khata_number: f("124"),
  area: f("0.245", { unit: "hectare" }),
  village: f("चिनहट"),
  tehsil: f("सदर"),
  district: f("लखनऊ"),
  state: f("उत्तर प्रदेश"),
};

function run(fields: Record<string, ExtractedFieldValue>, sameKhasra: ExistingRecord[] = []) {
  const canonical = canonicalizeLocation(master, {
    state: fields.state?.value,
    district: fields.district?.value,
    tehsil: fields.tehsil?.value,
    village: fields.village?.value,
  });
  return {
    canonical,
    result: validateCandidate({
      documentId: "DOC-1",
      fields,
      owners: [{ name: fields.owner_name?.value ?? "" }],
      canonical,
      sameKhasraRecords: sameKhasra,
      master,
      settings: { reviewThreshold: 0.8 },
      now: new Date("2026-10-01"),
    }),
  };
}

describe("location canonicalization", () => {
  it("maps Hindi place names to master records with coordinates", () => {
    const { canonical } = run(baseFields);
    expect(canonical).toMatchObject({ state: "Uttar Pradesh", district: "Lucknow", tehsil: "Sadar", village: "Chinhat", precision: "village" });
    expect(canonical.lat).toBeCloseTo(26.88, 2);
  });
});

describe("validation", () => {
  it("passes a clean record", () => {
    const { result } = run(baseFields);
    expect(result.errors).toEqual([]);
    expect(result.validation_status).toBe("VALID");
    expect(result.passed_checks).toContain("Khasra number format valid");
  });

  it("reports missing required fields as errors", () => {
    const { owner_name: _o, ...rest } = baseFields;
    void _o;
    const { result } = run(rest);
    expect(result.validation_status).toBe("INVALID");
    expect(result.errors.map((e) => e.field)).toContain("owner_name");
  });

  it("flags low confidence, unknown districts and implausible area", () => {
    const { result } = run({
      ...baseFields,
      owner_name: f("राम सिंह", { confidence: 0.55 }),
      district: f("Gotham"),
      area: f("9000", { unit: "hectare" }),
    });
    const types = result.warnings.map((w) => w.type);
    expect(types).toEqual(expect.arrayContaining(["LOW_CONFIDENCE", "LOCATION_MISMATCH", "AREA_IMPLAUSIBLE"]));
    expect(result.validation_status).toBe("REVIEW_REQUIRED");
  });

  it("detects duplicates across scripts and historical area mismatch", () => {
    const previous: ExistingRecord = {
      id: "LR-2026-000001",
      documentId: "DOC-0",
      status: "VERIFIED",
      ownerName: "Ram Singh",
      khasraNormalized: "235/1",
      khataNumber: "124",
      village: "Chinhat",
      district: "Lucknow",
      areaHectares: 0.3,
      area: 0.3,
      areaUnit: "hectare",
      mutationNumber: null,
      verifiedAt: "2025-01-01",
    };
    const { result } = run(baseFields, [previous]);
    expect(result.duplicate).toMatchObject({ detected: true, record_id: "LR-2026-000001" });
    const types = result.warnings.map((w) => w.type);
    expect(types).toContain("DUPLICATE_CANDIDATE");
    expect(types).toContain("HISTORICAL_MISMATCH");
  });

  it("checks owner shares and dates", () => {
    const canonical = canonicalizeLocation(master, { state: "Uttar Pradesh", district: "Lucknow" });
    const result = validateCandidate({
      documentId: "DOC-2",
      fields: { ...baseFields, mutation_date: f("2030-01-01") },
      owners: [
        { name: "A", share: 0.5 },
        { name: "B", share: 0.3 },
      ],
      canonical,
      sameKhasraRecords: [],
      master,
      settings: { reviewThreshold: 0.8 },
      now: new Date("2026-10-01"),
    });
    const types = result.warnings.map((w) => w.type);
    expect(types).toContain("SHARE_MISMATCH");
    expect(types).toContain("DATE_INVALID");
  });
});

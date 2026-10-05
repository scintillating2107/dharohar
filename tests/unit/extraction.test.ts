import { describe, expect, it } from "vitest";
import { combineExtraction, locateValue, ruleExtract } from "@/server/pipeline/extraction";
import type { OCRPageResult } from "@/types";

const HINDI_KHATAUNI = `खतौनी
ग्राम: चिनहट तहसील: सदर जिला: लखनऊ
खाता संख्या: 124
खातेदार का नाम: राम सिंह पुत्र मोहन सिंह
खसरा संख्या: २३५/१
रकबा: 0.2450 हेक्टेयर
दाखिल खारिज संख्या: M-2024-123
दाखिल खारिज दिनांक: 15/08/2023`;

describe("rule-based extraction", () => {
  it("extracts Hindi khatauni fields including inline relation", () => {
    const { values, owners } = ruleExtract(HINDI_KHATAUNI);
    expect(values.village?.value).toBe("चिनहट");
    expect(values.tehsil?.value).toBe("सदर");
    expect(values.district?.value).toBe("लखनऊ");
    expect(values.khata_number?.value).toBe("124");
    expect(values.owner_name?.value).toBe("राम सिंह");
    expect(values.father_name?.value).toBe("मोहन सिंह");
    expect(values.khasra_number?.value).toBe("235/1");
    expect(values.area).toMatchObject({ value: "0.245", unit: "hectare" });
    expect(values.mutation_number?.value).toBe("M-2024-123");
    expect(values.mutation_date?.value).toBe("2023-08-15");
    expect(owners[0]).toMatchObject({ name: "राम सिंह", relation_name: "मोहन सिंह" });
  });

  it("treats Hindi labels as whole words and recovers a khasra whose label OCR garbled", () => {
    const { values } = ruleExtract(`खाता संख्या: 518
TE संख्या: ४१२/३
भूमि का प्रकार: भूमिधरी`);
    expect(values.land_type?.value).toBe("भूमिधरी");
    expect(values.owner_name).toBeUndefined();
    expect(values.khasra_number).toMatchObject({ value: "412/3", confidence: 0.55 });
  });

  it("extracts English labels and ignores words that merely contain labels", () => {
    const { values } = ruleExtract(`Khatauni - Land Record
Khasra: 235/1
Khata: 124
Owner: Ram Singh
Father: Mohan Singh
Area: 1.80 hectare
Village: Chinhat
Tehsil: Sadar
District: Lucknow`);
    expect(values.khasra_number?.value).toBe("235/1");
    expect(values.khata_number?.value).toBe("124");
    expect(values.owner_name?.value).toBe("Ram Singh");
    expect(values.father_name?.value).toBe("Mohan Singh");
    expect(values.area).toMatchObject({ value: "1.8", unit: "hectare" });
    expect(values.village?.value).toBe("Chinhat");
    expect(values.district?.value).toBe("Lucknow");
  });
});

const PAGE: OCRPageResult = {
  page: 1,
  language: "en",
  text: "Owner: Ram Singh\nKhasra: 235/1",
  width: 800,
  height: 1100,
  regions: [
    { text: "Owner:", confidence: 0.95, bbox: [60, 200, 120, 225] },
    { text: "Ram", confidence: 0.9, bbox: [130, 200, 170, 225] },
    { text: "Singh", confidence: 0.8, bbox: [175, 200, 230, 225] },
    { text: "Khasra:", confidence: 0.96, bbox: [60, 120, 130, 145] },
    { text: "235/1", confidence: 0.97, bbox: [140, 120, 200, 145] },
  ],
};

describe("locating values and combining evidence", () => {
  it("finds the word sequence and its union box", () => {
    const hit = locateValue("Ram Singh", [PAGE]);
    expect(hit?.location).toEqual({ page: 1, bbox: [130, 200, 230, 225] });
    expect(hit?.ocrConfidence).toBeCloseTo(0.85, 2);
  });

  it("combines rule output with OCR confidence and flags metadata-only fields", () => {
    const rules = ruleExtract(PAGE.text);
    const { fields } = combineExtraction({
      pages: [PAGE],
      rules,
      gemini: null,
      metadata: { district: "Lucknow" },
      reviewThreshold: 0.8,
    });
    expect(fields.khasra_number.location?.bbox).toEqual([140, 120, 200, 145]);
    expect(fields.khasra_number.source).toBe("rules");
    expect(fields.district).toMatchObject({ value: "Lucknow", source: "metadata", needsReview: true });
  });

  it("converts Gemini normalized boxes to pixels when OCR cannot locate a value", () => {
    const { fields } = combineExtraction({
      pages: [PAGE],
      rules: { values: {}, owners: [] },
      gemini: {
        fields: { village: { value: "चिनहट", confidence: 0.9, page: 1, box_2d: [100, 100, 200, 500] } },
        owners: [],
      },
      metadata: {},
      reviewThreshold: 0.8,
    });
    expect(fields.village.location).toEqual({ page: 1, bbox: [80, 110, 400, 220] });
    expect(fields.village.source).toBe("gemini");
  });
});

import { describe, expect, it } from "vitest";
import {
  detectScripts,
  isValidKhasra,
  nameSimilarity,
  normalizeAreaUnit,
  normalizeDigits,
  normalizeKhasra,
  parseArea,
  parseIndianDate,
  phoneticKey,
  toHectares,
  transliterateDevanagari,
} from "@/server/pipeline/normalize";

describe("digits and khasra", () => {
  it("converts Indic digits", () => {
    expect(normalizeDigits("२३५/१")).toBe("235/1");
    expect(normalizeDigits("৪২")).toBe("42");
  });

  it("normalizes khasra numbers", () => {
    expect(normalizeKhasra("२३५ / १")).toBe("235/1");
    expect(normalizeKhasra("235-1")).toBe("235/1");
    expect(normalizeKhasra("Khasra No. 235/1")).toBe("235/1");
    expect(normalizeKhasra("खसरा संख्या 12 क")).toBe("12क");
  });

  it("validates khasra formats", () => {
    for (const ok of ["235", "235/1", "235/1/2", "235क", "12A", "७८/२"]) expect(isValidKhasra(ok)).toBe(true);
    for (const bad of ["abc", "235/abc", "", "1234567/1"]) expect(isValidKhasra(bad)).toBe(false);
  });
});

describe("names across scripts", () => {
  it("transliterates Devanagari", () => {
    expect(transliterateDevanagari("राम")).toBe("raam");
    expect(transliterateDevanagari("मोहन सिंह")).toBe("mohan sinh");
  });

  it("matches Hindi and English spellings of the same name", () => {
    expect(nameSimilarity("राम सिंह", "Ram Singh")).toBeGreaterThanOrEqual(0.9);
    expect(nameSimilarity("Mohan Singh", "Singh Mohan")).toBeGreaterThanOrEqual(0.9);
    expect(nameSimilarity("Ram Singh", "Shyam Lal")).toBeLessThan(0.6);
    expect(phoneticKey("Raam")).toBe(phoneticKey("Ram"));
  });
});

describe("area", () => {
  it("parses area strings in Hindi and English", () => {
    expect(parseArea("0.2450 हेक्टेयर")).toEqual({ value: 0.245, unit: "hectare" });
    expect(parseArea("1.80 ha")).toEqual({ value: 1.8, unit: "hectare" });
    expect(parseArea("२ बीघा")).toEqual({ value: 2, unit: "bigha" });
    expect(parseArea("3 acres")?.unit).toBe("acre");
  });

  it("converts to hectares with state-specific bigha", () => {
    expect(toHectares(1, "acre")).toBeCloseTo(0.4047, 4);
    expect(toHectares(1, "bigha", "Uttar Pradesh")).toBeCloseTo(0.2529, 4);
    expect(toHectares(1, "bigha", "Punjab")).toBeCloseTo(0.0836, 4);
    expect(toHectares(20, "biswa", "Uttar Pradesh")).toBeCloseTo(0.2529, 4);
    expect(normalizeAreaUnit("furlong")).toBeNull();
  });
});

describe("dates and scripts", () => {
  it("parses Indian date formats", () => {
    expect(parseIndianDate("15/08/2023")).toBe("2023-08-15");
    expect(parseIndianDate("१५-०८-२०२३")).toBe("2023-08-15");
    expect(parseIndianDate("2023-08-15")).toBe("2023-08-15");
    expect(parseIndianDate("31/02/2023")).toBeNull();
  });

  it("detects dominant script", () => {
    expect(detectScripts("खाता संख्या 125 ग्राम रामपुर").primary).toBe("hi");
    expect(detectScripts("Khata number 125 village Rampur").primary).toBe("en");
    expect(detectScripts("খতিয়ান নম্বর").primary).toBe("bn");
    expect(detectScripts("खाता संख्या owner Ram Singh khasra").mixed).toBe(true);
  });
});

describe("describeScriptMix", () => {
  it("reports the share of each script in recognised text", async () => {
    const { describeScriptMix } = await import("@/server/pipeline/normalize");
    expect(describeScriptMix("खसरा संख्या Khasra")).toMatch(/^Devanagari \d+% \+ Latin \d+%$/);
    expect(describeScriptMix("12345")).toBeNull();
  });
});

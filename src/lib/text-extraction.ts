import type { ParsedDocumentMetadata } from "./document-metadata";

export interface TextExtractionResult extends ParsedDocumentMetadata {
  raw_text: string;
  area?: string;
  area_unit?: string;
  registration_number?: string;
  mutation_number?: string;
  mutation_date?: string;
  father_name?: string;
  khata_number?: string;
  tehsil?: string;
}

const PATTERNS: { key: keyof TextExtractionResult; regex: RegExp }[] = [
  { key: "owner_name", regex: /(?:owner|malik|name of owner|मालिक)[\s:]*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s.'-]{1,60})/i },
  { key: "father_name", regex: /(?:father|s\/o|pita|पिता)[\s:]*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s.'-]{1,60})/i },
  { key: "khasra_number", regex: /(?:khasra|khasra no|खसरा)[\s:]*([0-9]{1,4}\s*[/-]\s*[0-9]{1,4})/i },
  { key: "khata_number", regex: /(?:khata|khata no|खाता)[\s:]*([0-9]{1,6})/i },
  { key: "village", regex: /(?:village|gaon|ग्राम)[\s:]*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,40})/i },
  { key: "tehsil", regex: /(?:tehsil|तहसील)[\s:]*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,40})/i },
  { key: "district", regex: /(?:district|जिला)[\s:]*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,40})/i },
  { key: "state", regex: /(?:state|राज्य)[\s:]*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s-]{1,40})/i },
  { key: "registration_number", regex: /(?:registration|reg\.? no)[\s:]*([A-Z0-9/-]{4,30})/i },
  { key: "mutation_number", regex: /(?:mutation|mut\.? no)[\s:]*([A-Z0-9/-]{4,30})/i },
  { key: "mutation_date", regex: /(?:mutation date|mut\.? date)[\s:]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}[/-][0-9]{2}[/-][0-9]{4})/i },
  { key: "area", regex: /(?:area|rakba|area\s*in|r\.?area)[\s:]*([0-9]+(?:\.[0-9]+)?)/i },
];

export function extractFieldsFromText(
  text: string,
  hints?: Partial<ParsedDocumentMetadata>
): TextExtractionResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  const result: TextExtractionResult = {
    raw_text: normalized,
    district: hints?.district,
    state: hints?.state || "Uttar Pradesh",
    village: hints?.village,
    owner_name: hints?.owner_name,
    khasra_number: hints?.khasra_number,
    khata_number: hints?.khata_number,
    tehsil: hints?.tehsil,
  };

  for (const { key, regex } of PATTERNS) {
    if (result[key]) continue;
    const match = normalized.match(regex);
    if (match?.[1]) {
      const value = match[1].trim().replace(/\s+/g, " ");
      if (key === "khasra_number") {
        result.khasra_number = value.replace(/\s+/g, "").replace("-", "/");
      } else if (key === "area") {
        result.area = value;
        result.area_unit = /hectare|ha|हे/i.test(normalized) ? "hectare" : "hectare";
      } else {
        (result as unknown as Record<string, string>)[key] = value;
      }
    }
  }

  return result;
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return {
      text: textResult.text || "",
      pageCount: textResult.total || textResult.pages?.length || 1,
    };
  } finally {
    await parser.destroy();
  }
}

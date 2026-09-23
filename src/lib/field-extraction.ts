import type { OCRRegion } from "@/types";
import type { OcrWord } from "./ocr-engine";
import type { TextExtractionResult } from "./text-extraction";
import { extractFieldsFromText } from "./text-extraction";

const FIELD_LABELS: Record<string, RegExp[]> = {
  owner_name: [/owner/i, /malik/i, /मालिक/i, /name/i],
  father_name: [/father/i, /s\/o/i, /पिता/i],
  khasra_number: [/khasra/i, /खसरा/i],
  khata_number: [/khata/i, /खाता/i],
  village: [/village/i, /gaon/i, /ग्राम/i],
  tehsil: [/tehsil/i, /तहसील/i],
  district: [/district/i, /जिला/i],
  area: [/area/i, /rakba/i, /हे/i, /hectare/i],
};

function normalizeKhasra(value: string): string {
  return value.replace(/\s+/g, "").replace("-", "/");
}

function findFieldRegion(
  fieldKey: string,
  value: string,
  words: OcrWord[]
): OCRRegion | null {
  const normalizedValue = value.toLowerCase();
  const match = words.find((w) => {
    const t = w.text.toLowerCase();
    return t === normalizedValue || t.includes(normalizedValue) || normalizedValue.includes(t);
  });

  if (!match) return null;
  return {
    text: match.text,
    confidence: match.confidence,
    bbox: match.bbox,
    fieldKey,
  };
}

export function buildRegionsFromExtraction(
  fields: TextExtractionResult,
  words: OcrWord[]
): OCRRegion[] {
  const regions: OCRRegion[] = [];
  const entries: [string, string | undefined][] = [
    ["owner_name", fields.owner_name],
    ["father_name", fields.father_name],
    ["khasra_number", fields.khasra_number],
    ["khata_number", fields.khata_number],
    ["village", fields.village],
    ["tehsil", fields.tehsil],
    ["district", fields.district],
    ["area", fields.area],
  ];

  for (const [key, value] of entries) {
    if (!value) continue;
    const region = findFieldRegion(key, value, words);
    if (region) regions.push(region);
  }

  return regions;
}

export function extractFieldsFromOcrWords(
  fullText: string,
  words: OcrWord[],
  hints?: { district?: string; state?: string }
): TextExtractionResult {
  const fromText = extractFieldsFromText(fullText, hints);

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const next = words[i + 1];
    const combined = `${word.text} ${next?.text || ""}`.trim();

    for (const [fieldKey, patterns] of Object.entries(FIELD_LABELS)) {
      const existing = fromText[fieldKey as keyof TextExtractionResult];
      if (existing) continue;
      if (!patterns.some((p) => p.test(word.text) || p.test(combined))) continue;

      const candidate = next?.text || word.text.replace(/^[^:\s]+[\s:]*/, "").trim();
      if (!candidate || candidate.length < 2) continue;

      if (fieldKey === "khasra_number") {
        const km = candidate.match(/(\d+\s*[/-]\s*\d+)/);
        if (km) fromText.khasra_number = normalizeKhasra(km[1]);
      } else if (fieldKey === "area") {
        const am = candidate.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (am) {
          fromText.area = am[1];
          fromText.area_unit = "hectare";
        }
      } else if (fieldKey === "owner_name") {
        fromText.owner_name = candidate;
      } else if (fieldKey === "father_name") {
        fromText.father_name = candidate;
      } else if (fieldKey === "village") {
        fromText.village = candidate;
      } else if (fieldKey === "tehsil") {
        fromText.tehsil = candidate;
      } else if (fieldKey === "district") {
        fromText.district = candidate;
      } else if (fieldKey === "khata_number") {
        fromText.khata_number = candidate;
      }
    }
  }

  const khasraInText = fullText.match(/(?:khasra|खसरा)[\s:]*([0-9]{1,4}\s*[/-]\s*[0-9]{1,4})/i);
  if (!fromText.khasra_number && khasraInText?.[1]) {
    fromText.khasra_number = normalizeKhasra(khasraInText[1]);
  }

  return fromText;
}

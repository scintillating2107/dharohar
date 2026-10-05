import { distance } from "fastest-levenshtein";
import type { ExtractedFieldValue, FieldLocation, OCRPageResult, Owner } from "@/types";
import {
  normalizeDigits,
  normalizeKhasra,
  parseArea,
  parseIndianDate,
  nameSimilarity,
} from "./normalize";
import type { ExtractionFieldKey, GeminiExtraction } from "./gemini";

// ---------------------------------------------------------------------------
// Rule-based extraction (bilingual label vocabulary)
// ---------------------------------------------------------------------------

const LABELS: [ExtractionFieldKey, RegExp][] = [
  ["mutation_date", /(?:दाखिल\s*खारिज|नामांतरण|नामान्तरण|mutation)\s*(?:की\s*)?(?:तिथि|तारीख|दिनांक|date)|date\s+of\s+mutation/giu],
  ["mutation_number", /(?:दाखिल\s*खारिज|नामांतरण|नामान्तरण)(?:\s*(?:वाद\s*)?(?:संख्या|सं\.?|नं\.?|क्रमांक))?|mutation(?:\s*(?:no\.?|number|order))?|mut\.?\s*no\.?/giu],
  ["registration_number", /(?:पंजीकरण|रजिस्ट्री)\s*(?:संख्या|सं\.?|नं\.?|क्रमांक)?|registration\s*(?:no\.?|number)?|reg\.?\s*no\.?|deed\s*no\.?/giu],
  ["father_name", /(?:पिता|पति)\s*(?:का\s*नाम)?|father'?s?\s*(?:\/\s*husband'?s?\s*)?name|father|husband'?s?\s*name|s\/o|d\/o|w\/o/giu],
  ["owner_name", /(?:खातेदार|भूमिधर|भूस्वामी|मालिक|स्वामी)(?:ों)?\s*(?:का\s*)?(?:नाम)?|owner'?s?\s*name|name\s+of\s+(?:the\s+)?(?:owner|khatedar|holder)|land\s*holder|khatedar|owner/giu],
  ["khasra_number", /(?:खसरा|गाटा)\s*(?:संख्या|सं\.?|नं\.?|क्रमांक)?|khasra\s*(?:no\.?|number)?|gata\s*(?:no\.?|number)?|plot\s*(?:no\.?|number)/giu],
  ["khata_number", /(?:खतौनी\s*)?खाता\s*(?:संख्या|सं\.?|नं\.?|क्रमांक)?|khata\s*(?:no\.?|number)?|khatauni\s*(?:no\.?|number)/giu],
  ["survey_number", /(?:सर्वे|सर्वेक्षण)\s*(?:संख्या|नं\.?)|survey\s*(?:no\.?|number)/giu],
  ["area", /रकबा|क्षेत्रफल|rakba|area(?:\s*\(?in\s*\w+\)?)?/giu],
  ["village", /ग्राम|गांव|गाँव|मौजा|मौज़ा|village|mauza|gram/giu],
  ["tehsil", /तहसील|tehsil|tahsil|taluka|taluk/giu],
  ["district", /जिला|ज़िला|जनपद|district|zila|zilla/giu],
  ["state", /राज्य|state/giu],
  ["land_type", /भूमि\s*(?:का\s*)?(?:प्रकार|श्रेणी)|श्रेणी|land\s*(?:type|class(?:ification)?|category)/giu],
];

const RELATION_SPLIT = /\s+(पुत्र|पुत्री|पत्नी|s\/o|d\/o|w\/o|son\s+of|daughter\s+of|wife\s+of)\s+/i;

interface LabelHit {
  key: ExtractionFieldKey;
  start: number;
  end: number;
}

function labelHits(line: string): LabelHit[] {
  const hits: LabelHit[] = [];
  for (const [key, re] of LABELS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      // Require a word boundary for Latin labels so "areas" inside words don't match
      const before = line[m.index - 1];
      const after = line[m.index + m[0].length];
      if (before && /[a-z]/i.test(before) && /^[a-z]/i.test(m[0])) continue;
      if (after && /[a-z]/i.test(after) && /[a-z.]$/i.test(m[0])) continue;
      // Devanagari labels must also be whole words ("भूमिधर" inside the value "भूमिधरी" is not a label)
      if (before && /[ऀ-ॿ]/.test(before) && /^[ऀ-ॿ]/.test(m[0])) continue;
      if (after && /[ऀ-ॿ]/.test(after) && /[ऀ-ॿ]$/.test(m[0])) continue;
      const overlaps = hits.some((h) => m!.index < h.end && m!.index + m![0].length > h.start);
      if (!overlaps) hits.push({ key, start: m.index, end: m.index + m[0].length });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

function cleanValue(raw: string): string {
  return raw
    .replace(/^[\s:：\-–—.|,;]+/, "")
    .replace(/[\s:：\-–—|,;]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface RuleExtraction {
  values: Partial<Record<ExtractionFieldKey, { value: string; unit?: string; confidence: number }>>;
  owners: Owner[];
}

/** Line-oriented label → value extraction over OCR text (Hindi and English labels). */
export function ruleExtract(text: string): RuleExtraction {
  const values: RuleExtraction["values"] = {};
  const lines = normalizeDigits(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li];
    const hits = labelHits(line);
    for (let i = 0; i < hits.length; i += 1) {
      const hit = hits[i];
      if (values[hit.key]) continue;
      let raw = line.slice(hit.end, hits[i + 1]?.start ?? line.length);
      // Label alone on its line: value is on the next line (common in tabular khatauni)
      if (!cleanValue(raw) && i === hits.length - 1 && lines[li + 1] && labelHits(lines[li + 1]).length === 0) {
        raw = lines[li + 1];
      }
      const value = cleanValue(raw);
      if (!value) continue;
      const parsed = postProcess(hit.key, value);
      if (parsed) values[hit.key] = parsed;
    }
  }

  // OCR often garbles the khasra label itself; a plot-style number (N/N) on a "number" line is
  // still very likely the khasra. Low confidence so the officer confirms it.
  if (!values.khasra_number) {
    for (const line of lines) {
      if (!/(संख्या|सं\.|नं\.|no\.?|number)/i.test(line)) continue;
      const m = line.match(/(?:^|[\s:])(\d{1,6}\s*\/\s*\d{1,4}[a-zऀ-ॿ]{0,2})(?=\s|$)/i);
      if (m && m[1].replace(/\s+/g, "") !== values.khata_number?.value) {
        values.khasra_number = { value: normalizeKhasra(m[1]), confidence: 0.55 };
        break;
      }
    }
  }

  // Inline relation: "राम सिंह पुत्र मोहन सिंह"
  const owner = values.owner_name?.value;
  if (owner) {
    const parts = owner.split(RELATION_SPLIT);
    if (parts.length >= 3) {
      values.owner_name = { ...values.owner_name!, value: parts[0].trim() };
      if (!values.father_name) {
        values.father_name = { value: parts[2].trim(), confidence: 0.7 };
      }
    }
  }

  const owners: Owner[] = values.owner_name
    ? [{ name: values.owner_name.value, relation_name: values.father_name?.value }]
    : [];
  return { values, owners };
}

function postProcess(
  key: ExtractionFieldKey,
  value: string
): { value: string; unit?: string; confidence: number } | null {
  switch (key) {
    case "khasra_number": {
      const m = value.match(/\d{1,6}\s*[a-zऀ-ॿ]{0,2}(?:\s*[/\-]\s*\d{1,4}[a-zऀ-ॿ]{0,2}){0,3}/i);
      return m ? { value: normalizeKhasra(m[0]), confidence: 0.82 } : null;
    }
    case "khata_number":
    case "survey_number": {
      const m = value.match(/\d{1,8}(?:\s*[/\-]\s*\d{1,4})?/);
      return m ? { value: m[0].replace(/\s+/g, ""), confidence: 0.8 } : null;
    }
    case "area": {
      const a = parseArea(value);
      return a ? { value: String(a.value), unit: a.unit ?? undefined, confidence: a.unit ? 0.78 : 0.6 } : null;
    }
    case "mutation_date": {
      const m = value.match(/\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}/);
      const iso = m ? parseIndianDate(m[0]) : null;
      return iso ? { value: iso, confidence: 0.75 } : null;
    }
    case "mutation_number":
    case "registration_number": {
      const m = value.match(/[A-Za-z0-9ऀ-ॿ][A-Za-z0-9ऀ-ॿ/\-]{1,30}/);
      return m ? { value: m[0], confidence: 0.7 } : null;
    }
    default: {
      // Names and places: stop at obvious next-column noise, cap length
      const v = value.split(/\s{3,}|\t/)[0].slice(0, 80).trim();
      if (v.length < 2 || /^\d+$/.test(v)) return null;
      return { value: v, confidence: 0.7 };
    }
  }
}

// ---------------------------------------------------------------------------
// Locating values on the page
// ---------------------------------------------------------------------------

function tokenKey(s: string): string {
  return normalizeDigits(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}/.]/gu, "");
}

/** Finds the OCR word sequence that best matches `value` and returns its union box and confidence. */
export function locateValue(
  value: string,
  pages: OCRPageResult[]
): { location: FieldLocation; ocrConfidence: number; similarity: number } | null {
  const target = tokenKey(value.replace(/\s+/g, ""));
  if (!target) return null;
  const targetTokens = value.split(/\s+/).filter(Boolean).length;
  let best: { location: FieldLocation; ocrConfidence: number; similarity: number } | null = null;

  for (const page of pages) {
    const words = page.regions;
    for (let i = 0; i < words.length; i += 1) {
      let joined = "";
      for (let len = 1; len <= Math.min(targetTokens + 2, 8) && i + len <= words.length; len += 1) {
        joined += tokenKey(words[i + len - 1].text);
        if (!joined) continue;
        const sim = 1 - distance(joined, target) / Math.max(joined.length, target.length);
        if (sim >= 0.75 && (!best || sim > best.similarity)) {
          const slice = words.slice(i, i + len);
          best = {
            similarity: sim,
            ocrConfidence: slice.reduce((s, w) => s + w.confidence, 0) / slice.length,
            location: {
              page: page.page,
              bbox: [
                Math.min(...slice.map((w) => w.bbox[0])),
                Math.min(...slice.map((w) => w.bbox[1])),
                Math.max(...slice.map((w) => w.bbox[2])),
                Math.max(...slice.map((w) => w.bbox[3])),
              ],
            },
          };
          if (sim === 1) break;
        }
      }
    }
  }
  return best;
}

function boxFromGemini(
  box: number[] | undefined,
  page: number | undefined,
  pages: OCRPageResult[]
): FieldLocation | undefined {
  if (!box || box.length !== 4 || !page) return undefined;
  const p = pages.find((x) => x.page === page);
  if (!p?.width || !p.height) return undefined;
  const [ymin, xmin, ymax, xmax] = box.map((v) => Math.min(1000, Math.max(0, v)));
  if (xmax <= xmin || ymax <= ymin) return undefined;
  return {
    page,
    bbox: [
      Math.round((xmin / 1000) * p.width),
      Math.round((ymin / 1000) * p.height),
      Math.round((xmax / 1000) * p.width),
      Math.round((ymax / 1000) * p.height),
    ],
  };
}

// ---------------------------------------------------------------------------
// Combining model output, rules, OCR evidence and upload metadata
// ---------------------------------------------------------------------------

export interface CombineInput {
  pages: OCRPageResult[];
  gemini?: GeminiExtraction | null;
  rules: RuleExtraction;
  metadata: { district?: string | null; state?: string | null; tehsil?: string | null; village?: string | null };
  reviewThreshold: number;
}

export function combineExtraction(input: CombineInput): {
  fields: Record<string, ExtractedFieldValue>;
  owners: Owner[];
} {
  const fields: Record<string, ExtractedFieldValue> = {};
  const keys = new Set<string>([
    ...Object.keys(input.gemini?.fields ?? {}),
    ...Object.keys(input.rules.values),
  ]);

  for (const key of keys) {
    const g = input.gemini?.fields?.[key as ExtractionFieldKey] ?? null;
    const r = input.rules.values[key as ExtractionFieldKey];
    const primary = g?.value?.trim() ? g : r;
    if (!primary?.value?.trim()) continue;

    let value = primary.value.trim();
    let unit = primary.unit?.trim() || undefined;
    if (key === "khasra_number") value = normalizeKhasra(value);
    if (key === "mutation_date") value = parseIndianDate(value) ?? value;
    if (key === "area") {
      const a = parseArea(`${value} ${unit ?? ""}`);
      if (a) {
        value = String(a.value);
        unit = a.unit ?? unit;
      }
    }

    let modelConfidence = Math.min(1, Math.max(0, Number(primary.confidence) || 0.5));
    let note: string | undefined;
    if (g?.value && r?.value) {
      const agree =
        key === "khasra_number"
          ? normalizeKhasra(g.value) === normalizeKhasra(r.value)
          : nameSimilarity(g.value, r.value) >= 0.85 || tokenKey(g.value) === tokenKey(r.value);
      if (agree) modelConfidence = Math.min(0.99, modelConfidence + 0.05);
      else {
        modelConfidence *= 0.85;
        note = `Rule-based reading differs: "${r.value}"`;
      }
    }

    const located = locateValue(value, input.pages) ?? (key === "area" ? locateValue(primary.value, input.pages) : null);
    const location = located?.location ?? boxFromGemini(g?.box_2d, g?.page, input.pages);
    const ocrConfidence = located?.ocrConfidence;
    const confidence =
      ocrConfidence !== undefined ? 0.6 * modelConfidence + 0.4 * ocrConfidence : modelConfidence * 0.9;

    fields[key] = {
      value,
      ...(unit ? { unit } : {}),
      confidence: Math.round(confidence * 1000) / 1000,
      modelConfidence: Math.round(modelConfidence * 1000) / 1000,
      ...(ocrConfidence !== undefined ? { ocrConfidence: Math.round(ocrConfidence * 1000) / 1000 } : {}),
      source: g?.value?.trim() ? "gemini" : "rules",
      ...(location ? { location, bbox: location.bbox } : {}),
      needsReview: confidence < input.reviewThreshold,
      ...(note ? { note } : {}),
    };
  }

  // Upload metadata fills location fields the document doesn't state — always flagged for review
  for (const key of ["village", "tehsil", "district", "state"] as const) {
    const meta = input.metadata[key];
    if (!fields[key] && meta) {
      fields[key] = {
        value: meta,
        confidence: 0.6,
        source: "metadata",
        needsReview: true,
        note: "Not found in the document; taken from upload metadata",
      };
    }
  }

  const owners: Owner[] = (input.gemini?.owners?.length ? input.gemini.owners : input.rules.owners)
    .filter((o) => o.name?.trim())
    .map((o) => ({
      name: o.name.trim(),
      ...(o.relation_name ? { relation_name: o.relation_name.trim() } : {}),
      ...(o.relation_type ? { relation_type: o.relation_type } : {}),
      ...(typeof o.share === "number" && Number.isFinite(o.share) ? { share: o.share } : {}),
    }));
  if (owners.length === 0 && fields.owner_name) {
    owners.push({ name: fields.owner_name.value, relation_name: fields.father_name?.value });
  }

  return { fields, owners };
}

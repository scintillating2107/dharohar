import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { env } from "@/server/env";

let client: GoogleGenAI | null = null;

function ai(): GoogleGenAI {
  if (!env.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|fetch failed|ECONNRESET/i.test(msg);
      if (!retryable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
  throw lastErr;
}

function parseJson<T>(text: string | undefined, what: string): T {
  if (!text) throw new Error(`Gemini returned an empty ${what} response`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON for ${what}`);
  }
}

// ---------------------------------------------------------------------------
// Transcription (text quality layer on top of Tesseract geometry)
// ---------------------------------------------------------------------------

export interface Transcription {
  text: string;
  language: string;
  handwritten: boolean;
}

export async function transcribePage(png: Buffer): Promise<Transcription> {
  const response = await withRetry(() =>
    ai().models.generateContent({
      model: env.geminiModel,
      contents: [
        { inlineData: { mimeType: "image/png", data: png.toString("base64") } },
        {
          text: `You are an OCR engine for Indian land-revenue documents (khatauni, jamabandi, khasra registers, mutation orders).
Transcribe ALL visible text exactly as written, line by line, preserving line breaks and table row order.
Text may be printed or handwritten, in Hindi, English or another Indian language, often mixed.
Rules: do not translate, do not correct spelling, do not infer missing text, keep digits exactly as written (including Devanagari digits), write [illegible] for unreadable words.
Return the dominant language as an ISO 639-1 code (hi, en, mr, bn, pa, gu, or, ta, te, kn, ml, ur) and whether any handwriting is present.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            handwritten: { type: Type.BOOLEAN },
            text: { type: Type.STRING },
          },
          required: ["language", "handwritten", "text"],
        },
      },
    })
  );
  const parsed = parseJson<Transcription>(response.text, "transcription");
  return { text: parsed.text ?? "", language: parsed.language ?? "unknown", handwritten: Boolean(parsed.handwritten) };
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

export const EXTRACTION_FIELDS = [
  "owner_name",
  "father_name",
  "khasra_number",
  "khata_number",
  "survey_number",
  "area",
  "village",
  "tehsil",
  "district",
  "state",
  "land_type",
  "registration_number",
  "mutation_number",
  "mutation_date",
] as const;

export type ExtractionFieldKey = (typeof EXTRACTION_FIELDS)[number];

export interface GeminiField {
  value: string;
  unit?: string;
  confidence: number;
  page?: number;
  /** [ymin, xmin, ymax, xmax] normalized to 0–1000 */
  box_2d?: number[];
}

export interface GeminiExtraction {
  fields: Partial<Record<ExtractionFieldKey, GeminiField | null>>;
  owners: { name: string; relation_name?: string; relation_type?: string; share?: number }[];
}

export interface FewShotExample {
  field: string;
  aiValue: string;
  humanValue: string;
}

function fieldSchema(withUnit: boolean): Schema {
  return {
    type: Type.OBJECT,
    nullable: true,
    properties: {
      value: { type: Type.STRING },
      ...(withUnit ? { unit: { type: Type.STRING } } : {}),
      confidence: { type: Type.NUMBER },
      page: { type: Type.INTEGER },
      box_2d: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    },
    required: withUnit ? ["value", "unit", "confidence"] : ["value", "confidence"],
  };
}

const FIELD_GUIDE: Record<ExtractionFieldKey, string> = {
  owner_name: "primary landholder / खातेदार / भूमिधर name (first owner if several)",
  father_name: "father's / husband's name of the primary owner (पिता / पति / S/O / W/O)",
  khasra_number: "khasra / plot / gata number (खसरा / गाटा संख्या), e.g. 235/1",
  khata_number: "khata / khatauni account number (खाता संख्या)",
  survey_number: "survey number if distinct from khasra",
  area: "area of the plot (रकबा / क्षेत्रफल) with its unit as written (hectare, acre, bigha, ...)",
  village: "village / mauza (ग्राम / मौजा)",
  tehsil: "tehsil / taluka (तहसील)",
  district: "district (जिला / जनपद)",
  state: "state",
  land_type: "land classification (e.g. भूमिधरी, agricultural, banjar, abadi)",
  registration_number: "deed / registration number",
  mutation_number: "mutation (दाखिल खारिज / नामांतरण) case or order number",
  mutation_date: "date of the mutation order",
};

export async function geminiExtract(input: {
  ocrText: string;
  pages: { page: number; png: Buffer }[];
  hints: { district?: string | null; state?: string | null; recordType?: string | null };
  examples: FewShotExample[];
}): Promise<GeminiExtraction> {
  const fieldProps: Record<string, Schema> = {};
  for (const key of EXTRACTION_FIELDS) fieldProps[key] = fieldSchema(key === "area");

  const examples = input.examples.length
    ? `\nPast officer corrections for similar documents (learn from them; never copy their values):\n${input.examples
        .map((e) => `- ${e.field}: AI read "${e.aiValue}" → officer corrected to "${e.humanValue}"`)
        .join("\n")}\n`
    : "";

  const prompt = `You extract structured data from an Indian land record (record type: ${input.hints.recordType ?? "unknown"}; expected district: ${input.hints.district ?? "unknown"}, state: ${input.hints.state ?? "unknown"}).
Use the page images as the source of truth and the OCR text as a reading aid.

Fields:
${EXTRACTION_FIELDS.map((k) => `- ${k}: ${FIELD_GUIDE[k]}`).join("\n")}

Rules:
- Copy values exactly as they appear in the document (same script). Do not translate or invent.
- If a field is absent, return null for it. Do not fill district/state from the hints unless printed on the page.
- confidence (0–1) = how sure you are that the value is correct and belongs to that field.
- page = 1-based page number where the value appears; box_2d = [ymin, xmin, ymax, xmax] of the value on that page, normalized to 0–1000.
- owners: every co-owner listed, with father/husband name, relation (S/O, D/O, W/O) and share as a fraction 0–1 if stated.
${examples}
OCR TEXT:
${input.ocrText.slice(0, 30000)}`;

  const response = await withRetry(() =>
    ai().models.generateContent({
      model: env.geminiModel,
      contents: [
        ...input.pages.slice(0, 6).map((p) => ({
          inlineData: { mimeType: "image/png", data: p.png.toString("base64") },
        })),
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fields: { type: Type.OBJECT, properties: fieldProps },
            owners: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  relation_name: { type: Type.STRING },
                  relation_type: { type: Type.STRING },
                  share: { type: Type.NUMBER },
                },
                required: ["name"],
              },
            },
          },
          required: ["fields", "owners"],
        },
      },
    })
  );
  const parsed = parseJson<GeminiExtraction>(response.text, "extraction");
  return { fields: parsed.fields ?? {}, owners: parsed.owners ?? [] };
}

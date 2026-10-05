import path from "path";
import type { Worker } from "tesseract.js";
import type { OCRPageResult, OCRRegion } from "@/types";
import { env } from "@/server/env";
import { detectScripts } from "./normalize";

/** Tesseract traineddata per language code (always paired with English for mixed records). */
export const TESSERACT_LANGS: Record<string, string> = {
  hi: "hin+eng",
  mr: "mar+eng",
  en: "eng",
  bn: "ben+eng",
  pa: "pan+eng",
  gu: "guj+eng",
  or: "ori+eng",
  ta: "tam+eng",
  te: "tel+eng",
  kn: "kan+eng",
  ml: "mal+eng",
  ur: "urd+eng",
};

/** Tesseract OSD script names → language code */
const OSD_SCRIPT_LANG: Record<string, string> = {
  Devanagari: "hi",
  Latin: "en",
  Bengali: "bn",
  Gurmukhi: "pa",
  Gujarati: "gu",
  Oriya: "or",
  Tamil: "ta",
  Telugu: "te",
  Kannada: "kn",
  Malayalam: "ml",
  Arabic: "ur",
};

function cachePath(): string {
  if (env.tesseractCacheDir) return env.tesseractCacheDir;
  if (env.isServerless) return path.join("/tmp", "tesseract-cache");
  return path.join(process.cwd(), "data", "tesseract-cache");
}

declare global {
  var __dharoharTess: Map<string, Promise<Worker>> | undefined;
}

async function getWorker(langs: string, osd = false): Promise<Worker> {
  global.__dharoharTess ??= new Map();
  const key = osd ? "osd" : langs;
  let worker = global.__dharoharTess.get(key);
  if (!worker) {
    const { createWorker } = await import("tesseract.js");
    worker = osd
      ? createWorker("osd", 0, { legacyCore: true, legacyLang: true, cachePath: cachePath(), logger: () => {} })
      : createWorker(langs, 1, { cachePath: cachePath(), logger: () => {} });
    worker.catch(() => global.__dharoharTess?.delete(key));
    global.__dharoharTess.set(key, worker);
  }
  return worker;
}

export interface OsdResult {
  language: string | null;
  script: string | null;
  scriptConfidence: number;
  orientation: number;
  orientationConfidence: number;
}

/** Orientation & script detection. Returns nulls when the page has too little text. */
export async function detectOrientationAndScript(png: Buffer): Promise<OsdResult> {
  try {
    const worker = await getWorker("osd", true);
    const { data } = await worker.detect(png);
    return {
      script: data.script,
      language: data.script ? OSD_SCRIPT_LANG[data.script] ?? null : null,
      scriptConfidence: data.script_confidence ?? 0,
      orientation: data.orientation_degrees ?? 0,
      orientationConfidence: data.orientation_confidence ?? 0,
    };
  } catch (err) {
    console.warn("[ocr] OSD failed:", err instanceof Error ? err.message : err);
    return { script: null, language: null, scriptConfidence: 0, orientation: 0, orientationConfidence: 0 };
  }
}

const NUMBER_TOKEN = /^[0-9][0-9/.\-]*[0-9]$|^[0-9]$/;

/**
 * Indic models often drop or misread Latin digits (a thin "1" is taken for a danda). Numbers
 * carry the identity of a land record (khata, khasra, area, dates), so every word containing a
 * digit is re-read from the same pixels with a digits-only English model; the re-read wins when
 * it is a clean number and at least as confident. Returns the number of words corrected.
 */
async function refineDigits(png: Buffer, regions: OCRRegion[], size: { width: number; height: number }): Promise<number> {
  const candidates = regions.filter((r) => /[0-9०-९]/.test(r.text) && !/[A-Za-z]{2,}/.test(r.text));
  if (!candidates.length) return 0;
  global.__dharoharTess ??= new Map();
  let digits = global.__dharoharTess.get("eng-digits");
  if (!digits) {
    const { createWorker } = await import("tesseract.js");
    digits = createWorker("eng", 1, { cachePath: cachePath(), logger: () => {} }).then(async (w) => {
      await w.setParameters({ tessedit_char_whitelist: "0123456789/.-", tessedit_pageseg_mode: "7" as never });
      return w;
    });
    digits.catch(() => global.__dharoharTess?.delete("eng-digits"));
    global.__dharoharTess.set("eng-digits", digits);
  }
  const worker = await digits;
  let changed = 0;
  const sameLine = (a: OCRRegion, b: OCRRegion) => Math.min(a.bbox[3], b.bbox[3]) - Math.max(a.bbox[1], b.bbox[1]) > 0.5 * (a.bbox[3] - a.bbox[1]);
  for (const region of candidates) {
    const [x0, y0, x1, y1] = region.bbox;
    const h = y1 - y0;
    // Dropped digits sit in the gap between this word and its neighbours on the same line:
    // widen the box into those gaps but never over a neighbouring word (e.g. a label's colon).
    const index = regions.indexOf(region);
    const prev = regions[index - 1];
    const next = regions[index + 1];
    const prevEdge = prev && sameLine(prev, region) && prev.bbox[2] <= x0 ? prev.bbox[2] + 2 : 0;
    const nextEdge = next && sameLine(next, region) && next.bbox[0] >= x1 ? next.bbox[0] - 2 : size.width;
    const left = Math.max(0, prevEdge, Math.round(x0 - h * 0.9));
    const top = Math.max(0, Math.round(y0 - h * 0.2));
    const right = Math.min(size.width, nextEdge, Math.round(x1 + h * 0.9));
    const bottom = Math.min(size.height, Math.round(y1 + h * 0.2));
    if (right - left < 4 || bottom - top < 4) continue;
    const { data } = await worker.recognize(png, { rectangle: { left, top, width: right - left, height: bottom - top } });
    const reread = (data.text ?? "").replace(/\s+/g, "").replace(/^[.\-/]+|[.\-/]+$/g, "");
    const confidence = Math.min(1, Math.max(0, (data.confidence ?? 0) / 100));
    const original = region.text.replace(/[^0-9०-९/.\-]/g, "");
    if (!NUMBER_TOKEN.test(reread) || reread === original) continue;
    if (confidence + 0.05 < region.confidence) continue;
    // Only accept re-reads that keep the original's digits in order (adds dropped ones, never invents a new number)
    if (!isSubsequence(toAsciiDigits(original).replace(/[^0-9]/g, ""), reread.replace(/[^0-9]/g, ""))) continue;
    region.text = region.text.replace(/[0-9०-९][0-9०-९/.\-]*[0-9०-९]|[0-9०-९]/, reread);
    region.confidence = Math.max(region.confidence, confidence);
    changed += 1;
  }
  return changed;
}

function toAsciiDigits(s: string): string {
  return s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}

function isSubsequence(short: string, long: string): boolean {
  let i = 0;
  for (const c of long) if (c === short[i]) i += 1;
  return i === short.length;
}

/** Word-level Tesseract OCR: text plus pixel bounding boxes and per-word confidence. */
export async function tesseractOcr(
  png: Buffer,
  page: number,
  language: string,
  size: { width: number; height: number }
): Promise<OCRPageResult> {
  const langs = TESSERACT_LANGS[language] ?? TESSERACT_LANGS.hi;
  const worker = await getWorker(langs);
  const { data } = await worker.recognize(png, {}, { blocks: true, text: true });

  const regions: OCRRegion[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = word.text.trim();
          if (!text) continue;
          regions.push({
            text,
            confidence: Math.min(1, Math.max(0, word.confidence / 100)),
            bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1],
          });
        }
      }
    }
  }
  const refined = langs === "eng" ? 0 : await refineDigits(png, regions, size);
  // Rebuild the text from words so refined numbers appear in the page text too
  const text = refined
    ? (data.blocks ?? [])
        .flatMap((block) => block.paragraphs ?? [])
        .flatMap((para) => para.lines ?? [])
        .map((line) =>
          (line.words ?? [])
            .map((word) => regions.find((r) => r.bbox[0] === word.bbox.x0 && r.bbox[1] === word.bbox.y0)?.text ?? word.text.trim())
            .filter(Boolean)
            .join(" ")
        )
        .filter(Boolean)
        .join("\n")
    : (data.text ?? "").trim();
  const meanConfidence = regions.length
    ? regions.reduce((s, r) => s + r.confidence, 0) / regions.length
    : 0;
  const detected = detectScripts(text);

  return {
    page,
    text,
    language: detected.primary === "unknown" ? language : detected.mixed ? `${detected.primary}+en` : detected.primary,
    regions,
    width: size.width,
    height: size.height,
    engine: `tesseract:${langs}`,
    meanConfidence: Math.round(meanConfidence * 1000) / 1000,
  };
}

export async function terminateOcrWorkers(): Promise<void> {
  const workers = global.__dharoharTess;
  if (!workers) return;
  global.__dharoharTess = new Map();
  await Promise.all(
    [...workers.values()].map(async (w) => {
      try {
        await (await w).terminate();
      } catch {
        // already gone
      }
    })
  );
}

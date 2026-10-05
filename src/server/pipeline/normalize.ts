import { distance } from "fastest-levenshtein";

// ---------------------------------------------------------------------------
// Digits
// ---------------------------------------------------------------------------

const DIGIT_BLOCKS = [
  0x0966, // Devanagari
  0x09e6, // Bengali
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Odia
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
];

/** Converts any Indic-script digits to ASCII 0–9. */
export function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    const block = DIGIT_BLOCKS.find((b) => code >= b && code <= b + 9);
    out += block !== undefined ? String(code - block) : ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Khasra / survey numbers
// ---------------------------------------------------------------------------

/**
 * Canonical khasra form: ASCII digits, no spaces, "/" as the only separator.
 * "२३५ / १" → "235/1", "235-1" → "235/1", "235 क" → "235क", "235/1/2" stays.
 */
export function normalizeKhasra(input: string): string {
  let s = normalizeDigits(input).trim();
  s = s.replace(/^(?:khasra\s*(?:no\.?|number)?|खसरा(?:\s*(?:संख्या|सं|नं)\.?)?)[\s:.-]*/i, "");
  s = s.replace(/\s+/g, "");
  s = s.replace(/(\d)[-\\|।](?=\d)/g, "$1/");
  s = s.replace(/\/{2,}/g, "/").replace(/^\/|\/$/g, "");
  return s.toLowerCase();
}

/** Accepts plot numbers like 235, 235/1, 235/1/2, 235क, 235/1क, 12A. */
export const KHASRA_PATTERN = /^\d{1,6}[a-zऀ-ॿ]{0,2}(\/\d{1,4}[a-zऀ-ॿ]{0,2}){0,3}$/i;

export function isValidKhasra(input: string): boolean {
  return KHASRA_PATTERN.test(normalizeKhasra(input));
}

// ---------------------------------------------------------------------------
// Devanagari → Latin transliteration (for matching names across scripts)
// ---------------------------------------------------------------------------

const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "n",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h",
  ळ: "l", क़: "q", ख़: "kh", ग़: "g", ज़: "z", ड़: "r", ढ़: "rh", फ़: "f", य़: "y",
};

const VOWELS: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri",
  ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऑ: "o",
};

const MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o",
};

const VIRAMA = "्";
const NUKTA = "़";

export function transliterateDevanagari(input: string): string {
  const chars = Array.from(input.normalize("NFC"));
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    let ch = chars[i];
    if (chars[i + 1] === NUKTA) {
      ch = ch + NUKTA;
      i += 1;
    }
    const consonant = CONSONANTS[ch] ?? CONSONANTS[ch.normalize("NFC")];
    if (consonant) {
      out += consonant;
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i += 1;
      } else if (next && MATRAS[next]) {
        out += MATRAS[next];
        i += 1;
      } else {
        // Inherent vowel, dropped at word end (schwa deletion: राम → ram)
        const isWordEnd = !next || !/[ऀ-ॿ]/.test(next) || next === "ं" || next === "ः";
        if (!isWordEnd || next === "ं") out += "a";
      }
      continue;
    }
    if (VOWELS[ch]) {
      out += VOWELS[ch];
      continue;
    }
    if (ch === "ं" || ch === "ँ") {
      out += "n";
      continue;
    }
    if (ch === "ः") {
      out += "h";
      continue;
    }
    if (ch === "।") {
      out += ".";
      continue;
    }
    out += ch;
  }
  return normalizeDigits(out);
}

/** Phonetic key that tolerates common spelling variation in Indian names (Singh/Sinh, Ram/Raam). */
export function phoneticKey(input: string): string {
  let s = transliterateDevanagari(input).toLowerCase();
  s = s.replace(/[^a-z0-9 ]/g, " ");
  s = s
    .replace(/aa/g, "a")
    .replace(/(ee|ii)/g, "i")
    .replace(/(oo|uu)/g, "u")
    .replace(/w/g, "v")
    .replace(/ph/g, "f")
    .replace(/z/g, "j")
    .replace(/(sh|ss)/g, "s")
    .replace(/q/g, "k")
    .replace(/ck/g, "k")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/(?<=[bcdfgjklmnpqrstvxyz])h/g, "")
    .replace(/ng\b/g, "n");
  // Trailing inherent vowels are inconsistent across spellings ("Rama"/"Ram")
  s = s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/a$/, "") : w))
    .join(" ");
  return s.trim();
}

/** 0–1 similarity of two names, script- and spelling-tolerant. */
export function nameSimilarity(a: string, b: string): number {
  const ka = phoneticKey(a);
  const kb = phoneticKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  const maxLen = Math.max(ka.length, kb.length);
  const direct = 1 - distance(ka, kb) / maxLen;
  // Token-sorted comparison handles "Singh Ram" vs "Ram Singh"
  const sa = ka.split(" ").sort().join(" ");
  const sb = kb.split(" ").sort().join(" ");
  const sorted = 1 - distance(sa, sb) / Math.max(sa.length, sb.length);
  return Math.max(0, Math.max(direct, sorted));
}

/** Normalized place-name key for comparing villages / tehsils / districts. */
export function placeKey(input: string): string {
  return phoneticKey(
    input
      .replace(/\b(gram|graam|village|tehsil|tahsil|district|jila|zila|janpad|pargana)\b/gi, "")
      .replace(/(ग्राम|गांव|तहसील|जिला|जनपद|परगना)/g, "")
  );
}

// ---------------------------------------------------------------------------
// Area units
// ---------------------------------------------------------------------------

/** Square metres per unit. Bigha/biswa vary by state; values are the common revenue standards. */
const BIGHA_SQM_BY_STATE: Record<string, number> = {
  "uttar pradesh": 2529.29,
  rajasthan: 2529.29,
  "madhya pradesh": 2529.29,
  bihar: 2529.29,
  jharkhand: 2529.29,
  uttarakhand: 2529.29,
  "himachal pradesh": 800,
  punjab: 836.13,
  haryana: 836.13,
  gujarat: 1618.74,
  assam: 1337.8,
  "west bengal": 1337.8,
  tripura: 1337.8,
};
const DEFAULT_BIGHA_SQM = 2529.29;

export type AreaUnit =
  | "hectare"
  | "acre"
  | "sqm"
  | "sqft"
  | "bigha"
  | "biswa"
  | "biswansi"
  | "decimal"
  | "kanal"
  | "marla"
  | "guntha"
  | "are";

const UNIT_ALIASES: [RegExp, AreaUnit][] = [
  [/^(hectares?|hect?\.?|ha\.?|हेक्टेयर|हेक्टे?\.?|हे\.?|है\.?)$/i, "hectare"],
  [/^(acres?|ac\.?|एकड़|एकड)$/i, "acre"],
  [/^(sq\.?\s*m(eters?|etres?)?|m2|m²|वर्ग\s*मीटर|वर्गमीटर|व\.?\s*मी\.?)$/i, "sqm"],
  [/^(sq\.?\s*f(ee)?t|ft2|ft²|वर्ग\s*फुट)$/i, "sqft"],
  [/^(bighas?|बीघा|बीघे)$/i, "bigha"],
  [/^(biswas?|बिस्वा)$/i, "biswa"],
  [/^(biswansi|बिस्वांसी)$/i, "biswansi"],
  [/^(decimals?|dismil|डिसमिल)$/i, "decimal"],
  [/^(kanals?|कनाल)$/i, "kanal"],
  [/^(marlas?|मरला)$/i, "marla"],
  [/^(gunthas?|गुंठा)$/i, "guntha"],
  [/^(ares?|आर)$/i, "are"],
];

export function normalizeAreaUnit(raw: string | undefined | null): AreaUnit | null {
  if (!raw) return null;
  const s = raw.trim();
  for (const [re, unit] of UNIT_ALIASES) if (re.test(s)) return unit;
  return null;
}

export function sqmPerUnit(unit: AreaUnit, state?: string | null): number {
  const bigha = BIGHA_SQM_BY_STATE[(state ?? "").trim().toLowerCase()] ?? DEFAULT_BIGHA_SQM;
  switch (unit) {
    case "hectare":
      return 10000;
    case "acre":
      return 4046.8564;
    case "sqm":
      return 1;
    case "sqft":
      return 0.09290304;
    case "bigha":
      return bigha;
    case "biswa":
      return bigha / 20;
    case "biswansi":
      return bigha / 400;
    case "decimal":
      return 40.468564;
    case "kanal":
      return 505.857;
    case "marla":
      return 25.2929;
    case "guntha":
      return 101.17141;
    case "are":
      return 100;
  }
}

export function toHectares(value: number, unit: string | null | undefined, state?: string | null): number | null {
  const u = normalizeAreaUnit(unit ?? "hectare") ?? null;
  if (!u || !Number.isFinite(value)) return null;
  return (value * sqmPerUnit(u, state)) / 10000;
}

/** Parses "0.2450 हेक्टेयर", "1.80 ha", "२ बीघा" into a value and unit. */
export function parseArea(input: string): { value: number; unit: AreaUnit | null } | null {
  const s = normalizeDigits(input).replace(/,/g, "");
  const match = s.match(/(\d+(?:\.\d+)?)\s*([^\d\s][^\d]*)?/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unitText = match[2]?.trim().split(/\s+/).slice(0, 2).join(" ");
  return { value, unit: normalizeAreaUnit(unitText) ?? normalizeAreaUnit(unitText?.split(" ")[0]) };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Parses dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd (Indic digits allowed) to ISO yyyy-mm-dd. */
export function parseIndianDate(input: string): string | null {
  const s = normalizeDigits(input).trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (y < 100) y += y > 50 ? 1900 : 2000;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Script / language detection
// ---------------------------------------------------------------------------

const SCRIPT_RANGES: [string, number, number][] = [
  ["hi", 0x0900, 0x097f], // Devanagari (Hindi / Marathi / Nepali)
  ["bn", 0x0980, 0x09ff],
  ["pa", 0x0a00, 0x0a7f],
  ["gu", 0x0a80, 0x0aff],
  ["or", 0x0b00, 0x0b7f],
  ["ta", 0x0b80, 0x0bff],
  ["te", 0x0c00, 0x0c7f],
  ["kn", 0x0c80, 0x0cff],
  ["ml", 0x0d00, 0x0d7f],
  ["ur", 0x0600, 0x06ff],
];

/** Counts letters per script and returns the dominant language code(s). */
export function detectScripts(text: string): { primary: string; mixed: boolean; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      counts.en = (counts.en ?? 0) + 1;
      continue;
    }
    for (const [lang, lo, hi] of SCRIPT_RANGES) {
      if (code >= lo && code <= hi && !(code >= lo + 0x66 && code <= lo + 0x6f)) {
        counts[lang] = (counts[lang] ?? 0) + 1;
        break;
      }
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { primary: "unknown", mixed: false, counts };
  const total = sorted.reduce((s, [, n]) => s + n, 0);
  const mixed = sorted.length > 1 && sorted[1][1] / total > 0.15;
  return { primary: sorted[0][0], mixed, counts };
}

export const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi (Devanagari)",
  mr: "Marathi",
  en: "English",
  bn: "Bengali",
  pa: "Punjabi",
  gu: "Gujarati",
  or: "Odia",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  ur: "Urdu",
  unknown: "Unknown",
};

const SCRIPT_NAMES: Record<string, string> = {
  hi: "Devanagari",
  en: "Latin",
  bn: "Bengali",
  pa: "Gurmukhi",
  gu: "Gujarati",
  or: "Odia",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  ur: "Perso-Arabic",
};

/** "Devanagari 78% + Latin 22%" — share of recognised letters per script (≥ 5%). */
export function describeScriptMix(text: string): string | null {
  const { counts } = detectScripts(text);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (!total) return null;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .filter(([, n]) => n / total >= 0.05)
    .map(([code, n]) => `${SCRIPT_NAMES[code] ?? code} ${Math.round((n / total) * 100)}%`)
    .join(" + ");
}

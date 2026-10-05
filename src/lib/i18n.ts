import { HI } from "./i18n-hi";

export type Locale = "en" | "hi";

/**
 * Translation model: English source text is the key. `t()` is for UI strings written in the
 * code; `tx()` additionally handles text produced by the server (validation messages, step
 * details, notifications, errors) through `{placeholder}` templates in the dictionary.
 * Untranslated text falls back to English, so nothing ever renders blank.
 */

let current: Locale = "en";

/** Set by the locale provider; read by date formatting outside React. */
export function setCurrentLocale(locale: Locale): void {
  current = locale;
}

export function getCurrentLocale(): Locale {
  return current;
}

type Vars = Record<string, string | number | null | undefined>;

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (vars[name] === undefined || vars[name] === null ? m : String(vars[name])));
}

export function translate(locale: Locale, text: string, vars?: Vars): string {
  if (locale === "hi") {
    const hit = HI[text];
    if (hit !== undefined) return interpolate(hit, vars);
  }
  return interpolate(text, vars);
}

interface Template {
  re: RegExp;
  names: string[];
  target: string;
}

let templates: Template[] | null = null;

function literalLength(re: RegExp): number {
  return re.source.replace(/\(\.\+\?\)/g, "").replace(/\\/g, "").length;
}

function compileTemplates(): Template[] {
  if (templates) return templates;
  templates = Object.entries(HI)
    .filter(([key]) => /\{\w+\}/.test(key))
    .map(([key, target]) => {
      const names: string[] = [];
      const pattern = key
        .split(/(\{\w+\})/)
        .map((part) => {
          const m = part.match(/^\{(\w+)\}$/);
          if (m) {
            names.push(m[1]);
            return "(.+?)";
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("");
      return { re: new RegExp(`^${pattern}$`, "s"), names, target };
    })
    // Most specific (longest literal text, then fewest placeholders) templates first
    .sort((a, b) => literalLength(b.re) - literalLength(a.re) || a.names.length - b.names.length);
  return templates;
}

/** Translates arbitrary (possibly server-generated) text. */
export function translateDynamic(locale: Locale, text: string | null | undefined): string {
  if (!text) return text ?? "";
  if (locale === "en") return text;
  const exact = HI[text];
  if (exact !== undefined) return exact;
  for (const sep of [" · ", "; "]) {
    if (text.includes(sep)) return text.split(sep).map((part) => translateDynamic(locale, part)).join(sep);
  }
  for (const tpl of compileTemplates()) {
    const m = text.match(tpl.re);
    if (!m) continue;
    return tpl.target.replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = m[tpl.names.indexOf(name) + 1];
      return value === undefined ? "" : translateDynamic(locale, value);
    });
  }
  // Lists such as "deskew, background flattening" or "Lucknow, Uttar Pradesh"
  if (text.includes(", ")) return text.split(", ").map((part) => translateDynamic(locale, part)).join(", ");
  return text;
}

export function intlLocale(locale: Locale = current): string {
  return locale === "hi" ? "hi-IN" : "en-IN";
}

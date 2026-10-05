"use client";

import type { Document } from "@/types";
import { ProcessingTimeline } from "@/components/processing/ProcessingTimeline";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDuration } from "@/lib/utils";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi",
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
};

/** Live view of the document's pipeline: real step outcomes, timings and engines. */
export function AIProcessingCenter({ document }: { document: Document }) {
  const { t, tx } = useLocale();
  const total = document.steps.reduce((s, st) => s + (st.durationMs ?? 0), 0);
  const quality = document.pages
    .filter((p) => p.qualityBefore && p.qualityAfter)
    .map((p) => ({ before: p.qualityBefore!.score, after: p.qualityAfter!.score }));
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const lang = document.detectedLanguage?.split("+")[0];

  const tiles = [
    { label: "Pages", value: document.pageCount || "—" },
    { label: "Image quality", value: quality.length ? `${avg(quality.map((q) => q.before))} → ${avg(quality.map((q) => q.after))}` : "—" },
    { label: "Language", value: lang ? t(LANGUAGE_NAMES[lang] ?? lang) : "—" },
    { label: "Processing time", value: total ? formatDuration(total) : "—" },
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-[var(--gov-border-light)] p-3">
            <dt className="text-xs text-[var(--gov-text-muted)]">{t(tile.label)}</dt>
            <dd className="font-semibold text-[var(--gov-navy)]">{tile.value}</dd>
          </div>
        ))}
      </dl>
      {document.ocrEngine && (
        <p className="text-xs text-[var(--gov-text-muted)]">
          {t("OCR engine")}: <span className="font-mono">{document.ocrEngine}</span>
        </p>
      )}
      {document.error && <p className="text-sm rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{tx(document.error)}</p>}
      <ProcessingTimeline steps={document.steps} />
    </div>
  );
}

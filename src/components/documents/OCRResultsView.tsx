"use client";

import { useState } from "react";
import type { Document, OCRResult } from "@/types";
import { Card } from "@/components/ui/Card";
import { DocumentViewer, type ViewerBox } from "@/components/documents/DocumentViewer";
import { cn, formatConfidence } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

/** Side-by-side scan with word boxes (coloured by confidence) and the recognised text per page. */
export function OCRResultsView({ document, ocr }: { document: Document; ocr: OCRResult }) {
  const { t } = useLocale();
  const [page, setPage] = useState(ocr.pages[0]?.page ?? 1);
  const [showBoxes, setShowBoxes] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const result = ocr.pages.find((p) => p.page === page) ?? ocr.pages[0];
  const boxes: ViewerBox[] = showBoxes
    ? (result?.regions ?? []).map((r, i) => ({ page: result.page, bbox: r.bbox, key: `w${i}`, label: `${r.text} (${formatConfidence(r.confidence)})`, confidence: r.confidence }))
    : [];
  const low = (result?.regions ?? []).filter((r) => r.confidence < 0.75);

  return (
    <div className="grid lg:grid-cols-2 gap-6 min-h-[560px]">
      <div className="min-h-[560px] flex flex-col">
        <label className="flex items-center gap-2 text-sm mb-2 text-[var(--gov-navy)]">
          <input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} /> {t("Show word boxes")}
          <span className="text-xs text-[var(--gov-text-muted)]">{t("(green ≥ 90%, amber ≥ 75%, red below)")}</span>
        </label>
        <div className="flex-1">
          <DocumentViewer pages={document.pages} boxes={boxes} page={page} onPageChange={setPage} highlightKey={hovered !== null ? `w${hovered}` : undefined} />
        </div>
      </div>

      <Card title={t("OCR text — page {n}", { n: result?.page ?? "—" })}>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--gov-text-muted)] mb-3">
          <span>{t("Language")}: <strong className="text-[var(--gov-navy)]">{result?.language ?? "—"}</strong></span>
          <span>{t("Words")}: <strong className="text-[var(--gov-navy)]">{result?.regions.length ?? 0}</strong></span>
          {result?.meanConfidence !== undefined && (
            <span>{t("Mean confidence")}: <strong className="text-[var(--gov-navy)]">{formatConfidence(result.meanConfidence)}</strong></span>
          )}
          {result?.engine && <span className="font-mono">{result.engine}</span>}
        </div>
        <pre className="text-sm leading-relaxed bg-[var(--gov-bg-subtle)] rounded-lg p-4 whitespace-pre-wrap border border-[var(--gov-border-light)] min-h-[200px] max-h-[420px] overflow-auto font-sans">
          {result?.text || t("No text recognised on this page.")}
        </pre>
        {low.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-2">
              {t("Low-confidence words ({n})", { n: low.length })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(result?.regions ?? []).map((r, i) =>
                r.confidence < 0.75 ? (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn("rounded border px-1.5 py-0.5 text-xs", r.confidence < 0.5 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50")}
                  >
                    {r.text} <span className="text-[var(--gov-text-muted)]">{formatConfidence(r.confidence)}</span>
                  </button>
                ) : null
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import type { Document, DocumentPage, PageQuality } from "@/types";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

const METRICS: { key: keyof PageQuality; label: string; format: (v: number) => string; good: (q: PageQuality) => boolean; hint: string }[] = [
  { key: "score", label: "Overall", format: (v) => `${v}/100`, good: (q) => q.score >= 70, hint: "Weighted sharpness, contrast, noise, skew" },
  { key: "sharpness", label: "Sharpness", format: (v) => String(v), good: (q) => !q.blurDetected, hint: "Variance of Laplacian; < 120 is blurred" },
  { key: "contrast", label: "Ink contrast", format: (v) => String(v), good: (q) => q.contrast >= 90, hint: "Paper level minus ink level (0–255)" },
  { key: "brightness", label: "Brightness", format: (v) => String(v), good: (q) => q.brightness >= 150, hint: "Mean luminance (0–255)" },
  { key: "noise", label: "Noise", format: (v) => v.toFixed(2), good: (q) => q.noise <= 4, hint: "Mean deviation from a 3×3 median" },
  { key: "skewAngle", label: "Skew", format: (v) => `${v.toFixed(1)}°`, good: (q) => Math.abs(q.skewAngle) < 0.5, hint: "Text-line angle from projection profile" },
];

function MetricTable({ page }: { page: DocumentPage }) {
  const { t } = useLocale();
  const before = page.qualityBefore;
  const after = page.qualityAfter;
  if (!before) return null;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-[var(--gov-text-muted)] text-left">
          <th className="py-1.5">{t("Metric")}</th>
          <th className="py-1.5">{t("Before")}</th>
          <th className="py-1.5">{t("After")}</th>
        </tr>
      </thead>
      <tbody>
        {METRICS.map((m) => (
          <tr key={m.key} className="border-t border-[var(--gov-border-light)]" title={t(m.hint)}>
            <td className="py-1.5 text-[var(--gov-text-muted)]">{t(m.label)}</td>
            <td className={cn("py-1.5 font-medium", m.good(before) ? "text-[var(--gov-green)]" : "text-amber-700")}>
              {m.format(before[m.key] as number)}
            </td>
            <td className={cn("py-1.5 font-medium", after && m.good(after) ? "text-[var(--gov-green)]" : "text-amber-700")}>
              {after ? m.format(after[m.key] as number) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Per-page original vs enhanced images with measured quality metrics. */
export function DocumentQualityPanel({ document }: { document: Document }) {
  const { t, tx } = useLocale();
  if (document.pages.length === 0) {
    const isPdf = document.fileType === "application/pdf";
    const src = `/api/documents/${document.id}/file`;
    return (
      <Card title="Original upload">
        <p className="text-sm text-[var(--gov-text-muted)] mb-4">
          {t("Pages are rendered, measured and enhanced when processing starts.")}
        </p>
        {isPdf ? (
          <iframe src={src} title={t("Original PDF")} className="w-full min-h-[640px] rounded border border-[var(--gov-border-light)] bg-white" />
        ) : document.fileType === "image/tiff" ? (
          <p className="text-sm">{t("TIFF preview is available after rendering.")}</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={t("Original upload")} className="max-h-[720px] mx-auto rounded border border-[var(--gov-border-light)]" />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {document.pages.map((p) => (
        <Card key={p.page} title={t("Page {n}", { n: p.page })}>
          <div className="grid xl:grid-cols-[1fr_1fr_280px] gap-4">
            <figure>
              <figcaption className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-2">{t("Original scan")}</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={`Page ${p.page} original`} className="w-full rounded border border-[var(--gov-border-light)] bg-white" loading="lazy" />
            </figure>
            <figure>
              <figcaption className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-2">{t("Enhanced for OCR")}</figcaption>
              {p.processedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.processedImageUrl} alt={`Page ${p.page} enhanced`} className="w-full rounded border border-[var(--gov-border-light)] bg-white" loading="lazy" />
              ) : (
                <div className="aspect-[3/4] rounded border border-dashed border-[var(--gov-border)] flex items-center justify-center text-sm text-[var(--gov-text-muted)]">
                  {t("Not enhanced yet")}
                </div>
              )}
            </figure>
            <div className="space-y-3">
              <MetricTable page={p} />
              {p.enhancedBy && <p className="text-xs text-[var(--gov-text-muted)]">{tx(p.enhancedBy)}</p>}
              {p.language && <p className="text-xs text-[var(--gov-text-muted)]">{t("Detected script language")}: {p.language}</p>}
              {p.width && p.height && <p className="text-xs text-[var(--gov-text-light)]">{p.width} × {p.height} px</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

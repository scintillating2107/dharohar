"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { DocumentPage } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

export interface ViewerBox {
  page: number;
  bbox: [number, number, number, number];
  key: string;
  label?: string;
  confidence?: number;
}

interface DocumentViewerProps {
  pages: DocumentPage[];
  /** Boxes in pixel coordinates of the processed page image */
  boxes?: ViewerBox[];
  /** Key of the box to emphasise (e.g. focused field) */
  highlightKey?: string;
  /** Page to show (1-based); follows the highlighted box when it changes */
  page?: number;
  onPageChange?: (page: number) => void;
  defaultVariant?: "enhanced" | "original";
}

function boxColor(confidence: number | undefined, highlighted: boolean) {
  if (highlighted) return "border-amber-500 bg-amber-400/25 ring-2 ring-amber-400";
  if (confidence === undefined) return "border-blue-500/60 bg-blue-400/10";
  if (confidence >= 0.9) return "border-green-600/60 bg-green-500/10";
  if (confidence >= 0.75) return "border-amber-500/70 bg-amber-400/10";
  return "border-red-500/70 bg-red-400/15";
}

/**
 * Page image viewer with overlay boxes. Boxes are scaled by the page's pixel size so they line
 * up at any zoom level.
 */
export function DocumentViewer({ pages, boxes = [], highlightKey, page, onPageChange, defaultVariant = "enhanced" }: DocumentViewerProps) {
  const { t } = useLocale();
  const [localPage, setLocalPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [variant, setVariant] = useState<"enhanced" | "original">(defaultVariant);
  const currentPage = page ?? localPage;
  const setPage = (p: number) => {
    setLocalPage(p);
    onPageChange?.(p);
  };

  const current = pages.find((p) => p.page === currentPage) ?? pages[0];
  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[420px] rounded-lg border border-dashed border-[var(--gov-border)] bg-white text-sm text-[var(--gov-text-muted)]">
        {t("Pages appear here once the document has been rendered.")}
      </div>
    );
  }
  const hasEnhanced = Boolean(current.processedImageUrl);
  const src = variant === "enhanced" && hasEnhanced ? current.processedImageUrl : current.imageUrl;
  // Boxes are computed on the processed image; hide them on the original if it was rotated/deskewed
  const showBoxes = variant === "enhanced" || !hasEnhanced;
  const pageBoxes = showBoxes ? boxes.filter((b) => b.page === current.page) : [];
  const index = pages.indexOf(current);

  return (
    <div className="flex flex-col h-full border border-[var(--gov-border-light)] rounded-lg bg-slate-100 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--gov-border-light)] bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPage(pages[index - 1].page)} disabled={index <= 0} aria-label={t("Previous page")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[var(--gov-text-muted)] min-w-[80px] text-center">
            {t("Page {page} of {pages}", { page: current.page, pages: pages.length })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setPage(pages[index + 1].page)} disabled={index >= pages.length - 1} aria-label={t("Next page")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {hasEnhanced && (
            <Button variant="ghost" size="sm" onClick={() => setVariant(variant === "enhanced" ? "original" : "enhanced")}>
              <Eye className="h-4 w-4" /> {variant === "enhanced" ? t("Enhanced") : t("Original")}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} aria-label={t("Zoom out")}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[var(--gov-text-muted)] w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(4, zoom + 0.25))} aria-label={t("Zoom in")}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setZoom(1)} aria-label={t("Fit width")}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="relative mx-auto" style={{ width: `${zoom * 100}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={t("Page {n}", { n: current.page })} className="w-full h-auto shadow-md bg-white select-none" draggable={false} />
          {current.width && current.height
            ? pageBoxes.map((b) => {
                const highlighted = b.key === highlightKey;
                return (
                  <div
                    key={`${b.key}-${b.bbox.join(",")}`}
                    title={b.label}
                    className={cn("absolute border-2 pointer-events-none rounded-sm transition-colors", boxColor(b.confidence, highlighted))}
                    style={{
                      left: `${(b.bbox[0] / current.width!) * 100}%`,
                      top: `${(b.bbox[1] / current.height!) * 100}%`,
                      width: `${((b.bbox[2] - b.bbox[0]) / current.width!) * 100}%`,
                      height: `${((b.bbox[3] - b.bbox[1]) / current.height!) * 100}%`,
                    }}
                  />
                );
              })
            : null}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="flex gap-2 border-t border-[var(--gov-border-light)] bg-white p-2 overflow-x-auto">
          {pages.map((p) => (
            <button
              key={p.page}
              type="button"
              onClick={() => setPage(p.page)}
              className={cn(
                "flex-shrink-0 w-12 h-16 rounded border overflow-hidden",
                p.page === current.page ? "border-[var(--gov-navy)] ring-1 ring-[var(--gov-navy)]" : "border-[var(--gov-border-light)]"
              )}
              aria-label={t("Page {n}", { n: p.page })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.processedImageUrl || p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

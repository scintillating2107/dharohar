"use client";

import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import type { DocumentPage, OCRRegion } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  pages: DocumentPage[];
  regions?: OCRRegion[];
  highlightedField?: string;
  onFieldHighlight?: (fieldKey: string) => void;
  fileType?: string;
}

export function DocumentViewer({
  pages,
  regions = [],
  highlightedField,
  fileType,
}: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const page = pages[currentPage];
  const imageUrl = page?.processedImageUrl || page?.imageUrl;
  const isPdf = fileType === "application/pdf";
  const pageRegions = regions.filter((r) => r.fieldKey);

  return (
    <div className="flex flex-col h-full border border-slate-200 rounded-lg bg-slate-100 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-600 min-w-[80px] text-center">
            Page {currentPage + 1} / {pages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
            disabled={currentPage >= pages.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        <div className="relative mx-auto" style={{ width: `${zoom * 100}%`, maxWidth: "100%" }}>
          {imageUrl ? (
            isPdf && (page?.processedImageUrl || page?.imageUrl?.includes("processed=true")) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={page?.processedImageUrl || imageUrl}
                alt={`Document page ${currentPage + 1}`}
                className="w-full h-auto shadow-md"
              />
            ) : isPdf ? (
              <iframe
                src={imageUrl}
                title={`Document page ${currentPage + 1}`}
                className="w-full min-h-[620px] bg-white shadow-md"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt={`Document page ${currentPage + 1}`}
                className="w-full h-auto shadow-md"
              />
            )
          ) : (
            <div className="flex items-center justify-center min-h-[420px] bg-white border border-dashed border-slate-300 text-sm text-slate-500">
              No preview available for this page
            </div>
          )}
          {pageRegions.map((region, i) => (
            region.fieldKey && (
              <div
                key={i}
                className={cn(
                  "absolute border-2 pointer-events-none transition-colors",
                  highlightedField === region.fieldKey
                    ? "border-amber-500 bg-amber-500/20"
                    : "border-blue-400/50 bg-blue-400/10"
                )}
                style={{
                  left: `${(region.bbox[0] / 800) * 100}%`,
                  top: `${(region.bbox[1] / 1100) * 100}%`,
                  width: `${((region.bbox[2] - region.bbox[0]) / 800) * 100}%`,
                  height: `${((region.bbox[3] - region.bbox[1]) / 1100) * 100}%`,
                }}
              />
            )
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="flex gap-2 border-t border-slate-200 bg-white p-2 overflow-x-auto">
          {pages.map((p, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={cn(
                "flex-shrink-0 w-12 h-16 rounded border overflow-hidden",
                i === currentPage ? "border-slate-800 ring-1 ring-slate-800" : "border-slate-200"
              )}
            >
              {p.processedImageUrl || p.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.processedImageUrl || p.imageUrl}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-400">
                  {i + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

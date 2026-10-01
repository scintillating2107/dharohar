"use client";

import { useState } from "react";
import type { Document, OCRResult } from "@/types";
import { Card } from "@/components/ui/Card";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { Button } from "@/components/ui/Button";
import { cn, formatConfidence } from "@/lib/utils";
import { Box, Eye, EyeOff, RotateCw } from "lucide-react";

export function OCRResultsView({
  document,
  ocr,
}: {
  document: Document;
  ocr: OCRResult;
}) {
  const [page, setPage] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [processedView, setProcessedView] = useState(false);

  const pageResult = ocr.pages[page] ?? ocr.pages[0];
  const regions = pageResult?.regions ?? [];

  return (
    <div className="grid lg:grid-cols-2 gap-6 min-h-[520px]">
      <Card title="Original document">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button size="sm" variant="outline" onClick={() => setShowBoxes(!showBoxes)}>
            <Box className="h-3.5 w-3.5" /> {showBoxes ? "Hide" : "Show"} bounding boxes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setProcessedView(!processedView)}>
            {processedView ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {processedView ? "Original" : "Processed"}
          </Button>
          <Button size="sm" variant="ghost">
            <RotateCw className="h-3.5 w-3.5" /> Rotate
          </Button>
        </div>
        <DocumentViewer
          pages={document.pages}
          regions={showBoxes ? regions : []}
          fileType={document.fileType}
        />
      </Card>

      <Card title="OCR output">
        <div className="flex items-center gap-2 mb-3 text-xs">
          {ocr.pages.map((p, i) => (
            <button
              key={p.page}
              type="button"
              onClick={() => setPage(i)}
              className={cn(
                "px-2.5 py-1 rounded border font-medium",
                i === page ? "border-[var(--gov-navy)] bg-[var(--gov-navy)]/5" : "border-[var(--gov-border)]"
              )}
            >
              Page {p.page}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto text-[var(--gov-navy-light)] font-semibold"
            onClick={() => setShowConfidence(!showConfidence)}
          >
            {showConfidence ? "Hide" : "Show"} confidence
          </button>
        </div>

        <pre className="text-sm leading-relaxed font-mono bg-[var(--gov-bg-subtle)] rounded-lg p-4 whitespace-pre-wrap border border-[var(--gov-border-light)] min-h-[200px]">
          {pageResult?.text}
        </pre>

        {showConfidence && regions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">
              Confidence visualization
            </p>
            {regions.slice(0, 12).map((r, i) => (
              <ConfidenceLine key={i} text={r.text} confidence={r.confidence} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ConfidenceLine({ text, confidence }: { text: string; confidence: number }) {
  const level = confidence >= 0.9 ? "high" : confidence >= 0.75 ? "medium" : "low";
  const dot =
    level === "high" ? "🟢" : level === "medium" ? "🟠" : "🔴";
  return (
    <div className="flex items-center justify-between text-sm py-1 border-b border-[var(--gov-border-light)] last:border-0">
      <span className="text-[var(--gov-navy)] truncate pr-4">{text}</span>
      <span className="flex items-center gap-2 flex-shrink-0 font-medium">
        {formatConfidence(confidence)} {dot}
      </span>
    </div>
  );
}

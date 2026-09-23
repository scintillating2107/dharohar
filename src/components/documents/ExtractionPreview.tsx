"use client";

import type { OCRResult, ExtractionResult } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "@/components/ui/StatusBadges";
import { getFieldLabel } from "@/lib/utils";

export function OCRPreview({ ocr }: { ocr: OCRResult }) {
  return (
    <Card title="OCR Results">
      {ocr.pages.map((page) => (
        <div key={page.page} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">Page {page.page}</span>
            <Badge variant="info">Language: {page.language.toUpperCase()}</Badge>
          </div>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3 font-mono leading-relaxed">
            {page.text}
          </p>
          {page.regions.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase">Detected Regions</p>
              {page.regions.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700">{r.text}</span>
                  <ConfidenceBadge confidence={r.confidence} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

export function ExtractionPreview({ extraction }: { extraction: ExtractionResult }) {
  const fields = Object.entries(extraction.fields);

  return (
    <Card title="Extracted Fields">
      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map(([key, field]) => (
          <div key={key} className="rounded-md border border-slate-100 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{getFieldLabel(key)}</span>
              <ConfidenceBadge confidence={field.confidence} />
            </div>
            <p className="text-sm font-medium text-slate-800">
              {field.value}
              {field.unit && <span className="text-slate-500 ml-1">{field.unit}</span>}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

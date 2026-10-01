"use client";

import type { Document, DocumentPage } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { LandRecordImagePair } from "@/components/demo/LandRecordImagePair";
import { DEMO_DOCUMENT_ID } from "@/lib/record-ids";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Wand2 } from "lucide-react";

interface QualityMetric {
  label: string;
  status: "good" | "medium" | "low";
  detail: string;
}

function metricsFromPage(page: DocumentPage | undefined, pageCount: number): QualityMetric[] {
  const score = page?.qualityScore ?? 76;
  const skew = page?.skewAngle ?? 3.2;
  const blur = page?.blurDetected ?? false;
  return [
    { label: "Blur", status: blur ? "medium" : "good", detail: blur ? "Slight blur" : "Good" },
    { label: "Brightness", status: score > 70 ? "good" : "medium", detail: score > 70 ? "Good" : "Medium" },
    { label: "Contrast", status: score > 65 ? "medium" : "low", detail: score > 65 ? "Medium" : "Low" },
    { label: "Skew", status: skew > 2 ? "medium" : "good", detail: `${skew.toFixed(1)}°` },
    { label: "Noise", status: "good", detail: "Low" },
    { label: "Pages", status: "good", detail: String(pageCount) },
  ];
}

export function DocumentQualityPanel({
  document,
  onEnhance,
  enhancing,
}: {
  document: Document;
  onEnhance?: () => void;
  enhancing?: boolean;
}) {
  const firstPage = document.pages[0];
  const overall = firstPage?.qualityScore ?? 76;
  const metrics = metricsFromPage(firstPage, document.pageCount);
  const showDemoEnhancement = document.id === DEMO_DOCUMENT_ID;

  if (showDemoEnhancement) {
    return (
      <div className="space-y-6">
        <LandRecordImagePair
          labelBefore="Original scan (before enhancement)"
          labelAfter="Enhanced scan (ready for OCR)"
        />
        <Card title="Document quality">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">Overall quality</p>
              <p className="text-4xl font-bold text-[var(--gov-navy)]">
                48% <span className="text-lg font-semibold text-[var(--gov-green)]">→ 84%</span>
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
              Ready for OCR
            </span>
          </div>
          {onEnhance && (
            <Button className="w-full" variant="outline" onClick={onEnhance} loading={enhancing}>
              <Wand2 className="h-4 w-4" /> Re-run enhancement
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card title="Original document">
        <div className="min-h-[420px]">
          <DocumentViewer pages={document.pages} fileType={document.fileType} />
        </div>
        <p className="text-xs text-[var(--gov-text-muted)] mt-3">
          Document type: {document.fileType.includes("pdf") ? "PDF register" : "Scanned image"} ·{" "}
          {document.pageCount} page{document.pageCount === 1 ? "" : "s"}
        </p>
      </Card>

      <Card title="Document quality">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">Overall quality</p>
            <p className="text-4xl font-bold text-[var(--gov-navy)]">{overall}%</p>
          </div>
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full",
              overall >= 80 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            )}
          >
            {overall >= 80 ? "Ready for OCR" : "Review recommended"}
          </span>
        </div>

        <ul className="space-y-3">
          {metrics.map((m) => (
            <li key={m.label} className="flex items-center justify-between text-sm border-b border-[var(--gov-border-light)] pb-2">
              <span className="text-[var(--gov-text-muted)]">{m.label}</span>
              <span className="flex items-center gap-2 font-medium text-[var(--gov-navy)]">
                {m.detail}
                {m.status === "good" ? (
                  <Check className="h-4 w-4 text-[var(--gov-green)]" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </span>
            </li>
          ))}
        </ul>

        {onEnhance && (
          <Button className="mt-6 w-full" variant="outline" onClick={onEnhance} loading={enhancing}>
            <Wand2 className="h-4 w-4" /> Enhance document
          </Button>
        )}
      </Card>
    </div>
  );
}

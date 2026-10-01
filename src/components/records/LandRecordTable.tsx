"use client";

import type { LandRecord } from "@/types";
import { formatConfidence, getConfidenceLevel, getFieldLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const DISPLAY_ORDER = [
  "owner_name",
  "father_name",
  "khasra_number",
  "khata_number",
  "survey_number",
  "area",
  "village",
  "tehsil",
  "district",
  "land_type",
  "mutation_number",
];

export function LandRecordTable({ record }: { record: LandRecord }) {
  const rows = DISPLAY_ORDER.filter((k) => record.fields[k]).map((key) => ({
    key,
    label: getFieldLabel(key),
    value: record.fields[key].value,
    unit: record.fields[key].unit,
    confidence: record.fields[key].confidence,
  }));

  const needsReview = rows.some((r) => getConfidenceLevel(r.confidence) === "low");

  return (
    <div className="gov-card overflow-hidden">
      <div className="gov-card-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--gov-text-muted)]">Record ID: {record.record_id}</p>
          <h3 className="text-lg font-bold text-[var(--gov-navy)]">AI extracted land record</h3>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">AI confidence</p>
          <p className="text-xl font-bold text-[var(--gov-navy)]">{formatConfidence(record.averageConfidence)}</p>
          <span
            className={cn(
              "inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full",
              needsReview ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"
            )}
          >
            {needsReview ? "NEEDS REVIEW ⚠" : record.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--gov-bg-subtle)] text-left text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">
              <th className="px-4 py-3 font-semibold">Field</th>
              <th className="px-4 py-3 font-semibold">Extracted value</th>
              <th className="px-4 py-3 font-semibold w-32">Confidence</th>
              <th className="px-4 py-3 font-semibold w-36">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const level = getConfidenceLevel(row.confidence);
              const review = level === "low";
              return (
                <tr
                  key={row.key}
                  className={cn(
                    "border-t border-[var(--gov-border-light)]",
                    review && "bg-amber-50/70"
                  )}
                >
                  <td className="px-4 py-3 text-[var(--gov-text-muted)]">{row.label}</td>
                  <td className="px-4 py-3 font-medium text-[var(--gov-navy)]">
                    {row.value}
                    {row.unit ? <span className="text-[var(--gov-text-muted)] ml-1">{row.unit}</span> : null}
                  </td>
                  <td className="px-4 py-3">{formatConfidence(row.confidence)}</td>
                  <td className="px-4 py-3">
                    {review ? (
                      <span className="inline-flex items-center gap-1 text-amber-800 text-xs font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" /> Needs review
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--gov-text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

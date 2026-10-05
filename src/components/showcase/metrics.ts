import type { RecordDetail } from "@/components/records/Record360";
import { FIELD_SECTIONS } from "@/lib/config";
import type { SystemSettings } from "@/types";
import type { ShowcaseStepKey } from "./content";

export interface Metric {
  label: string;
  /** Number for count-up animation, or preformatted text */
  value: number | string;
  /** Shown before an animated number, e.g. "62 → " */
  prefix?: string;
  suffix?: string;
  decimals?: number;
  tone?: "navy" | "green" | "amber" | "red";
}

const detailOf = (d: RecordDetail, key: string) => d.document?.steps.find((s) => s.key === key)?.detail ?? "";

/** Three headline results per step, derived from the record's stored outputs. */
export function stepMetrics(key: ShowcaseStepKey, d: RecordDetail, settings: SystemSettings | null, chainChecked?: number): Metric[] {
  const { record } = d;
  const page = d.document?.pages[0];
  switch (key) {
    case "enhance": {
      const b = page?.qualityBefore;
      const a = page?.qualityAfter;
      const ops = detailOf(d, "image_enhancement").split(" · ").slice(1).join(" · ").split(", ").filter(Boolean).length;
      return [
        { label: "Quality score", prefix: b ? `${b.score} → ` : "", value: a?.score ?? "—", tone: "green" },
        { label: "Skew corrected", value: b ? `${b.skewAngle}° → ${a?.skewAngle ?? 0}°` : "—" },
        { label: "Corrections applied", value: ops },
      ];
    }
    case "ocr": {
      const pages = record.ocr?.pages ?? [];
      const words = pages.reduce((s, p) => s + p.regions.length, 0);
      const conf = pages.length ? (pages.reduce((s, p) => s + (p.meanConfidence ?? 0), 0) / pages.length) * 100 : 0;
      const mix = detailOf(d, "ocr").match(/[A-Z][a-z-]+ \d+%(?: \+ [A-Z][a-z-]+ \d+%)*/)?.[0];
      return [
        { label: "Words recognised", value: words },
        { label: "Mean OCR confidence", value: Math.round(conf * 10) / 10, decimals: 1, suffix: "%", tone: conf >= 85 ? "green" : "amber" },
        { label: "Scripts on the page", value: mix ?? record.ocr?.pages[0]?.language ?? "—" },
      ];
    }
    case "schema": {
      const total = Object.values(FIELD_SECTIONS).flat().length;
      const fields = Object.values(record.fields);
      return [
        { label: "Fields extracted", value: fields.length, suffix: ` / ${total}`, tone: "green" },
        { label: "Linked to their place on the scan", value: fields.filter((f) => f.location).length },
        { label: "Owners identified", value: record.owners?.length || (record.owner_name ? 1 : 0) },
      ];
    }
    case "validate": {
      const v = record.validation;
      const score = v?.validation_score ?? 0;
      return [
        { label: "Validation score", value: score, suffix: " / 100", tone: score >= 80 ? "green" : score >= 50 ? "amber" : "red" },
        { label: "Checks passed", value: v?.passed_checks?.length ?? 0, tone: "green" },
        { label: "Issues flagged for review", value: (v?.errors.length ?? 0) + (v?.warnings.length ?? 0), tone: "amber" },
      ];
    }
    case "confidence": {
      const review = settings?.reviewThreshold ?? 0.8;
      const avg = record.averageConfidence * 100;
      return [
        { label: "Record confidence", value: Math.round(avg), suffix: "%", tone: avg >= review * 100 ? "green" : "amber" },
        { label: "Fields sent to the officer", value: Object.values(record.fields).filter((f) => f.confidence < review).length, tone: "amber" },
        { label: "Review threshold", value: Math.round(review * 100), suffix: "%" },
      ];
    }
    case "verify": {
      const corrected = d.corrections.filter((c) => !c.accepted).length;
      return [
        { label: "Status", value: record.status === "VERIFIED" ? "Verified" : record.status === "REJECTED" ? "Rejected" : "Under review", tone: record.status === "VERIFIED" ? "green" : "amber" },
        { label: "Fields corrected by officer", value: corrected },
        { label: "Verified by", value: record.verifiedBy ?? "—" },
      ];
    }
    case "gis": {
      const p = d.parcel;
      const recorded = record.area_hectares ?? record.area;
      const surveyed = p?.geometry_source === "surveyed" ? p.polygon_area_ha ?? null : null;
      const diff = surveyed && recorded ? ((surveyed - recorded) / recorded) * 100 : null;
      return [
        { label: "Recorded area (ha)", value: recorded, decimals: 3 },
        { label: "Surveyed area (ha)", value: surveyed ?? "—", decimals: 4, tone: surveyed ? "green" : "navy" },
        { label: "Difference", value: diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`, tone: diff === null ? "navy" : Math.abs(diff) <= (settings?.areaTolerancePct ?? 5) ? "green" : "red" },
      ];
    }
    case "ledger": {
      const blocks = d.auditEvents.filter((e) => e.hash).length;
      return [
        { label: "Ledger blocks for this record", value: blocks },
        chainChecked !== undefined
          ? { label: "Ledger entries re-verified", value: chainChecked, tone: "green" }
          : { label: "Signed record version", value: `v${record.version ?? 1}` },
        { label: "Digital signature", value: record.certificate ? "Ed25519 ✓" : "Pending", tone: record.certificate ? "green" : "amber" },
      ];
    }
  }
}

"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FieldSourceBadge } from "@/components/ui/StatusBadges";
import { DocumentViewer, type ViewerBox } from "@/components/documents/DocumentViewer";
import { OCRResultsView } from "@/components/documents/OCRResultsView";
import { ValidationSummary } from "@/components/validation/ValidationSummary";
import type { RecordDetail } from "@/components/records/Record360";
import { useLocale } from "@/contexts/LocaleContext";
import { DOCUMENT_LANGUAGES, FIELD_SECTIONS } from "@/lib/config";
import { cn, getFieldLabel } from "@/lib/utils";
import type { Document, PageQuality } from "@/types";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, RefreshCcw, Table2, Braces } from "lucide-react";
import { CompareSlider } from "./CompareSlider";

export function stepDetail(document: Document | null, key: string): string | undefined {
  return document?.steps.find((s) => s.key === key)?.detail;
}

/** Small "label: value" tile used across the panels. */
export function Fact({ label, value, tone = "navy" }: { label: string; value: React.ReactNode; tone?: "navy" | "green" | "amber" | "red" }) {
  const { t } = useLocale();
  const color = { navy: "text-[var(--gov-navy)]", green: "text-[var(--gov-green)]", amber: "text-amber-700", red: "text-red-700" }[tone];
  return (
    <div className="rounded-lg border border-[var(--gov-border-light)] bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[var(--gov-text-muted)]">{t(label)}</p>
      <p className={cn("text-lg font-bold leading-tight", color)}>{value}</p>
    </div>
  );
}

// ── 1. Image enhancement ───────────────────────────────────────────────────

const METRICS: { key: keyof PageQuality; label: string; better: "up" | "down" | "near230"; fmt: (v: number) => string }[] = [
  { key: "score", label: "Overall", better: "up", fmt: (v) => `${v}/100` },
  { key: "sharpness", label: "Sharpness", better: "up", fmt: (v) => String(v) },
  { key: "contrast", label: "Ink contrast", better: "up", fmt: (v) => String(v) },
  { key: "brightness", label: "Brightness", better: "near230", fmt: (v) => String(v) },
  { key: "noise", label: "Noise", better: "down", fmt: (v) => String(v) },
  { key: "skewAngle", label: "Skew", better: "down", fmt: (v) => `${v}°` },
];

export function EnhancementPanel({ document }: { document: Document }) {
  const { t, tx } = useLocale();
  const page = document.pages[0];
  const detail = stepDetail(document, "image_enhancement");
  const ops = detail?.split(" · ").slice(1).join(" · ").split(", ").filter(Boolean) ?? [];

  if (!page?.imageUrl) return <p className="text-sm text-[var(--gov-text-muted)]">{t("Pages appear here once the document has been rendered.")}</p>;
  const before = page.qualityBefore;
  const after = page.qualityAfter;

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div>
        {page.processedImageUrl ? (
          <CompareSlider before={page.imageUrl} after={page.processedImageUrl} beforeLabel="Original scan" afterLabel="Enhanced for OCR" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.imageUrl} alt={t("Original scan")} className="w-full rounded-lg border" />
        )}
        <p className="mt-2 text-xs text-[var(--gov-text-muted)]">{t("Drag the divider to compare the original scan with the enhanced page.")}</p>
      </div>
      <div className="space-y-3">
        {before && after && (
          <Card title="Measured quality">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-[var(--gov-text-muted)]">
                  <th className="pb-1">{t("Metric")}</th>
                  <th className="pb-1 text-right">{t("Before")}</th>
                  <th className="pb-1 text-right">{t("After")}</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const b = Number(before[m.key]);
                  const a = Number(after[m.key]);
                  const improved = m.better === "up" ? a > b : m.better === "down" ? Math.abs(a) < Math.abs(b) : Math.abs(a - 230) < Math.abs(b - 230);
                  return (
                    <tr key={m.key} className="border-t border-[var(--gov-border-light)]">
                      <td className="py-1.5">{t(m.label)}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--gov-text-muted)]">{m.fmt(b)}</td>
                      <td className={cn("py-1.5 text-right tabular-nums font-semibold", improved ? "text-[var(--gov-green)]" : "text-[var(--gov-navy)]")}>{m.fmt(a)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
        {ops.length > 0 && (
          <Card title="Corrections applied">
            <ul className="space-y-1.5 text-sm">
              {ops.map((op) => (
                <li key={op} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--gov-green)] shrink-0" /> {tx(op)}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── 2. Multilingual OCR ─────────────────────────────────────────────────────

export function OcrPanel({ detail }: { detail: RecordDetail }) {
  const { t, tx } = useLocale();
  const document = detail.document!;
  const ocr = detail.record.ocr;
  const language = stepDetail(document, "language_detection");
  const ocrDetail = stepDetail(document, "ocr");

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {language && <Fact label="Script & language detection" value={<span className="text-sm">{tx(language)}</span>} />}
        {ocrDetail && <Fact label="Recognition" value={<span className="text-sm">{tx(ocrDetail)}</span>} />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DOCUMENT_LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
          <Badge key={l.code} variant={document.detectedLanguage?.startsWith(l.code) ? "success" : "neutral"}>
            {t(l.label)}
          </Badge>
        ))}
      </div>
      {ocr ? <OCRResultsView document={document} ocr={ocr} /> : <p className="text-sm text-[var(--gov-text-muted)]">{t("OCR output is not available yet. Complete processing first.")}</p>}
    </div>
  );
}

// ── 3. Structuring into the schema ─────────────────────────────────────────

export function SchemaPanel({ detail }: { detail: RecordDetail }) {
  const { t } = useLocale();
  const { record } = detail;
  const document = detail.document!;
  const [focus, setFocus] = useState<string | undefined>();
  const [view, setView] = useState<"table" | "json">("table");
  const keys = Object.values(FIELD_SECTIONS).flat();

  const boxes: ViewerBox[] = useMemo(
    () =>
      Object.entries(record.fields)
        .filter(([, f]) => f.location)
        .map(([key, f]) => ({ key, page: f.location!.page, bbox: f.location!.bbox, label: t(getFieldLabel(key)), confidence: f.confidence })),
    [record.fields, t]
  );
  const focusPage = focus ? record.fields[focus]?.location?.page : undefined;

  const payload = useMemo(
    () => ({
      schema: "dharohar.land_record.v1",
      record_id: record.record_id,
      version: record.version ?? 1,
      status: record.status,
      location: { state: record.state, district: record.district, tehsil: record.tehsil, village: record.village },
      khasra_number: record.khasra_number,
      khata_number: record.khata_number,
      area: { value: record.area, unit: record.area_unit, hectares: record.area_hectares ?? null },
      land_type: record.land_type ?? null,
      owners: record.owners?.length ? record.owners : [{ name: record.owner_name, relation_name: record.father_name }],
      mutation: { number: record.mutation_number ?? null, date: record.mutation_date ?? null },
      provenance: {
        document_id: record.document_id,
        source_sha256: document.sha256 ?? null,
        fields: Object.fromEntries(
          Object.entries(record.fields).map(([k, f]) => [k, { confidence: Math.round(f.confidence * 100) / 100, source: f.source ?? null, page: f.location?.page ?? null }])
        ),
      },
    }),
    [record, document.sha256]
  );

  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <div className="min-w-0">
        <DocumentViewer pages={document.pages} boxes={boxes} highlightKey={focus} page={focusPage} />
      </div>
      <Card
        title="Record schema"
        noPadding
        action={
          <div className="flex rounded-md border border-[var(--gov-border)] overflow-hidden text-xs font-semibold" role="group">
            <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")} className={cn("px-2.5 py-1 inline-flex items-center gap-1", view === "table" ? "bg-[var(--gov-navy)] text-white" : "bg-white")}>
              <Table2 className="h-3.5 w-3.5" /> {t("Fields")}
            </button>
            <button type="button" aria-pressed={view === "json"} onClick={() => setView("json")} className={cn("px-2.5 py-1 inline-flex items-center gap-1", view === "json" ? "bg-[var(--gov-navy)] text-white" : "bg-white")}>
              <Braces className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        }
      >
        {view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--gov-text-muted)] bg-[var(--gov-bg-subtle)]">
                  <th className="px-3 py-2">{t("Schema field")}</th>
                  <th className="px-3 py-2">{t("Value")}</th>
                  <th className="px-3 py-2">{t("Source")}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const f = record.fields[key];
                  return (
                    <tr
                      key={key}
                      onMouseEnter={() => f?.location && setFocus(key)}
                      onFocus={() => f?.location && setFocus(key)}
                      tabIndex={f?.location ? 0 : undefined}
                      className={cn("border-t border-[var(--gov-border-light)]", f?.location && "cursor-pointer hover:bg-amber-50", focus === key && "bg-amber-50")}
                    >
                      <td className="px-3 py-1.5 align-top">
                        <span className="block text-[var(--gov-navy)] font-medium">{t(getFieldLabel(key))}</span>
                        <span className="font-mono text-[10px] text-[var(--gov-text-light)]">{key}</span>
                      </td>
                      <td className="px-3 py-1.5 align-top font-medium">
                        {f ? `${f.value}${f.unit ? ` ${t(f.unit)}` : ""}` : <span className="text-[var(--gov-text-light)]">{t("Not found")}</span>}
                      </td>
                      <td className="px-3 py-1.5 align-top">{f && <FieldSourceBadge source={f.source} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="max-h-[520px] overflow-auto bg-[#0c2340] p-4 text-[11px] leading-relaxed text-green-200">{JSON.stringify(payload, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
}

// ── 4. Validation cycle ────────────────────────────────────────────────────

const STAGES: { name: string; types: string[] }[] = [
  { name: "Required fields", types: ["MISSING_FIELD", "METADATA_ONLY"] },
  { name: "Formats & plausibility", types: ["FORMAT_WARNING", "DATE_INVALID", "INVALID_AREA", "AREA_IMPLAUSIBLE", "UNKNOWN_UNIT", "SHARE_MISMATCH", "NAME_CONFLICT"] },
  { name: "Master data (LGD)", types: ["LOCATION_MISMATCH", "LOCATION_UNVERIFIED"] },
  { name: "Duplicates", types: ["DUPLICATE_CANDIDATE", "DUPLICATE_DOCUMENT"] },
  { name: "History of the plot", types: ["HISTORICAL_MISMATCH", "OWNERSHIP_CHANGE"] },
  { name: "Confidence", types: ["LOW_CONFIDENCE"] },
  { name: "Surveyed area", types: ["PARCEL_AREA_MISMATCH"] },
];

export function ValidationPanel({ detail }: { detail: RecordDetail }) {
  const { t } = useLocale();
  const v = detail.record.validation;
  if (!v) return <p className="text-sm text-[var(--gov-text-muted)]">{t("Not validated.")}</p>;

  const scores = [...detail.versions]
    .sort((a, b) => a.version - b.version)
    .map((ver) => ({ version: ver.version, score: ver.snapshot.validation?.validation_score, status: ver.snapshot.validation?.validation_status }))
    .filter((s) => s.score !== undefined);
  const last = scores[scores.length - 1];
  if (!last || last.score !== v.validation_score) scores.push({ version: detail.record.version ?? scores.length + 1, score: v.validation_score, status: v.validation_status });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch gap-2">
        {STAGES.map((stage, i) => {
          const errors = v.errors.filter((e) => stage.types.includes(e.type)).length;
          const warnings = v.warnings.filter((w) => stage.types.includes(w.type)).length;
          const state = errors ? "fail" : warnings ? "warn" : "pass";
          const Icon = state === "fail" ? XCircle : state === "warn" ? AlertTriangle : CheckCircle2;
          return (
            <div key={stage.name} className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 min-w-[130px]",
                  state === "fail" ? "border-red-200 bg-red-50" : state === "warn" ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"
                )}
              >
                <p className="text-[10px] font-bold text-[var(--gov-text-muted)]">{i + 1}</p>
                <p className="text-sm font-semibold text-[var(--gov-navy)] leading-tight">{t(stage.name)}</p>
                <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", state === "fail" ? "text-red-700" : state === "warn" ? "text-amber-700" : "text-[var(--gov-green)]")}>
                  <Icon className="h-3.5 w-3.5" />
                  {state === "pass" ? t("Passed") : t("{n} issue(s)", { n: errors + warnings })}
                </p>
              </div>
              {i < STAGES.length - 1 && <ArrowRight className="h-4 w-4 text-[var(--gov-border)] shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-dashed border-[var(--gov-navy-light)] bg-blue-50/40 p-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-2">
        <RefreshCcw className="h-4 w-4 text-[var(--gov-navy-light)]" />
        <span className="font-semibold text-[var(--gov-navy)]">{t("The cycle")}:</span>
        <span>{t("Officer edits a field")}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span>{t("validation re-runs")}</span>
        <ArrowRight className="h-3.5 w-3.5" />
        <span>{t("score and queue priority update")}</span>
        {scores.length > 1 && (
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            {scores.map((s, i) => (
              <span key={`${s.version}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ArrowRight className="h-3 w-3" />}
                <Badge variant={s.status === "VALID" ? "success" : s.status === "INVALID" ? "error" : "warning"}>
                  v{s.version}: {s.score}
                </Badge>
              </span>
            ))}
          </span>
        )}
      </div>

      <ValidationSummary validation={v} />
    </div>
  );
}

"use client";

import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard, BarList } from "@/components/dashboard/StatCard";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { useLocale } from "@/contexts/LocaleContext";
import { intlLocale } from "@/lib/i18n";
import { getFieldLabel } from "@/lib/utils";
import type { DashboardStats, DistrictProgress } from "@/types";
import { Download, Sparkles, Gauge, Timer, Brain, ImageUp } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface AnalyticsData {
  stats: DashboardStats;
  districtProgress: DistrictProgress[];
  processingChart: { month: string; uploaded: number; processed: number; verified: number }[];
  languages: { code: string; name: string; value: number }[];
  recordTypes: { type: string; count: number }[];
  fileTypes: { type: string; count: number }[];
  stepTimings: { key: string; label: string; avgSeconds: number; samples: number }[];
  ocrEngines: { engine: string; count: number }[];
  imageQuality: { before: number | null; after: number | null; pages: number };
  confidenceBuckets: { bucket: string; count: number }[];
  errorCategories: { type: string; name: string; count: number }[];
  accuracy: {
    overall: number | null;
    fieldsMeasured: number;
    byField: { field: string; total: number; accepted: number; accuracy: number }[];
    byMonth: { month: string; total: number; accepted: number; accuracy: number }[];
    bySource: { source: string; total: number; accepted: number; accuracy: number }[];
  };
}

interface LearningData {
  learnedRules: { field: string; from: string; to: string; count: number }[];
}

const BUCKET_ORDER = ["High (≥90%)", "Medium (75–90%)", "Low (<75%)"];
const BUCKET_COLOR: Record<string, string> = { "High (≥90%)": "var(--gov-green)", "Medium (75–90%)": "#d97706", "Low (<75%)": "#b91c1c" };
const SOURCE_LABELS: Record<string, string> = { gemini: "AI model", rules: "Rule-based", learned: "Learned correction", officer: "Officer", metadata: "Upload metadata", unknown: "Unknown" };

export function AnalyticsInsights() {
  const { t, locale } = useLocale();
  const { data, error, initialLoading, reload } = useApi<AnalyticsData>("/api/analytics");
  const learning = useApi<LearningData>("/api/learning/metrics");

  if (initialLoading) return <AppLayout title="Analytics"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="Analytics"><ErrorState message={error || "Could not load analytics"} onRetry={reload} /></AppLayout>;

  const totalSeconds = data.stepTimings.reduce((s, x) => s + x.avgSeconds, 0);
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: "2-digit" });
  const accuracyByMonth = data.accuracy.byMonth.map((m) => {
    const [y, mo] = m.month.split("-").map(Number);
    return { ...m, label: y && mo ? monthFmt.format(new Date(y, mo - 1, 1)) : m.month };
  });
  const buckets = [...data.confidenceBuckets].sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket));

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6">
        <PageTitle
          title="Analytics"
          description="Accuracy measured from officer corrections, processing performance and data-quality patterns."
          actions={
            <a href="/api/learning/export">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" /> {t("Export corrections (JSONL)")}
              </Button>
            </a>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Extraction accuracy"
            value={data.accuracy.overall === null ? "—" : `${data.accuracy.overall}%`}
            subtitle={t("{n} verified fields measured", { n: data.accuracy.fieldsMeasured })}
            icon={Sparkles}
            accent="green"
          />
          <StatCard title="Avg record confidence" value={`${data.stats.average_confidence}%`} icon={Gauge} accent="navy" />
          <StatCard
            title="Image quality"
            value={data.imageQuality.before === null ? "—" : `${data.imageQuality.before} → ${data.imageQuality.after}`}
            subtitle={t("{n} pages enhanced", { n: data.imageQuality.pages })}
            icon={ImageUp}
            accent="blue"
          />
          <StatCard
            title="Avg pipeline time"
            value={totalSeconds ? t("{n} s", { n: totalSeconds.toFixed(1) }) : "—"}
            subtitle={t("Render → validation")}
            icon={Timer}
            accent="saffron"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Accuracy by field">
            <BarList
              items={data.accuracy.byField.map((f) => ({ label: getFieldLabel(f.field), value: f.accuracy }))}
              color="var(--gov-green)"
              suffix="%"
              max={100}
              empty="Accuracy appears once officers approve records."
            />
          </Card>

          <Card title="Accuracy over time">
            {accuracyByMonth.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-10 text-center">{t("No verified records yet.")}</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyByMonth} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, t("Accuracy")]} />
                    <Line type="monotone" dataKey="accuracy" stroke="#1a7f37" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {data.accuracy.bySource.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--gov-text-muted)]">
                {data.accuracy.bySource.map((s) => (
                  <span key={s.source}>
                    <strong className="text-[var(--gov-navy)]">{t(SOURCE_LABELS[s.source] ?? s.source)}</strong>:{" "}
                    {t("{pct}% of {n}", { pct: s.accuracy, n: s.total })}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card title="Learned corrections">
            {!learning.data?.learnedRules.length ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-6 text-center">
                {t("When officers make the same correction twice, it is applied automatically to future extractions.")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[var(--gov-text-muted)]">
                      <th className="py-1 pr-3">{t("Field")}</th>
                      <th className="py-1 pr-3">{t("AI reading")}</th>
                      <th className="py-1 pr-3">{t("Corrected to")}</th>
                      <th className="py-1 text-right">{t("Times")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learning.data.learnedRules.map((r) => (
                      <tr key={`${r.field}-${r.from}`} className="border-t border-[var(--gov-border-light)]">
                        <td className="py-1.5 pr-3">{t(getFieldLabel(r.field))}</td>
                        <td className="py-1.5 pr-3 text-red-700 line-through">{r.from}</td>
                        <td className="py-1.5 pr-3 text-[var(--gov-green)] font-medium">{r.to}</td>
                        <td className="py-1.5 text-right">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-[var(--gov-text-muted)] mt-3 flex gap-1.5">
              <Brain className="h-4 w-4 flex-shrink-0" /> {t("Recent corrections are also given to the extraction model as examples.")}
            </p>
          </Card>

          <Card title="Pipeline step timings (average)">
            <BarList
              items={data.stepTimings.map((s) => ({ label: s.label, value: s.avgSeconds }))}
              color="var(--gov-navy-light)"
              suffix={` ${t("s")}`}
              empty="No processed documents yet."
            />
          </Card>

          <Card title="Validation issue categories">
            <BarList items={data.errorCategories.map((c) => ({ label: c.name, value: c.count }))} color="#e8750a" empty="No validation issues recorded." />
          </Card>

          <Card title="Record confidence distribution">
            <BarList items={buckets.map((b) => ({ label: b.bucket, value: b.count, color: BUCKET_COLOR[b.bucket] }))} empty="No records yet." />
          </Card>

          <Card title="Detected document language">
            <BarList items={data.languages.map((l) => ({ label: l.name, value: l.value }))} empty="No documents yet." />
          </Card>

          <Card title="Document types">
            <BarList items={data.recordTypes.map((r) => ({ label: r.type, value: r.count }))} empty="No documents yet." />
          </Card>

          <Card title="District progress" className="lg:col-span-2">
            {data.districtProgress.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-6 text-center">{t("No records yet.")}</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.districtProgress.map((d) => (
                  <div key={`${d.state}-${d.district}`} className="rounded-lg border border-[var(--gov-border-light)] p-4">
                    <p className="font-semibold text-[var(--gov-navy)]">{t(d.district)}</p>
                    <p className="text-xs text-[var(--gov-text-muted)]">{t(d.state)}</p>
                    <p className="text-2xl font-bold text-[var(--gov-green)] mt-1">{d.percentage}%</p>
                    <p className="text-xs text-[var(--gov-text-muted)]">{t("{a} of {b} records verified", { a: d.verified, b: d.total })}</p>
                    <div className="h-2 rounded-full bg-[var(--gov-border-light)] mt-2">
                      <div className="h-2 rounded-full bg-[var(--gov-green)]" style={{ width: `${d.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

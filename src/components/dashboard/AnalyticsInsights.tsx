"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { LoadingState, ErrorState } from "@/components/ui/States";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function extractionKpis(stats: {
  average_confidence: number;
  processed_documents: number;
  total_documents: number;
  validation_issues: number;
}) {
  const processedRate =
    stats.total_documents > 0
      ? Math.round((stats.processed_documents / stats.total_documents) * 1000) / 10
      : 0;
  const validationPass =
    stats.processed_documents > 0
      ? Math.round(
          ((stats.processed_documents - stats.validation_issues) / stats.processed_documents) * 1000
        ) / 10
      : 0;
  return [
    { label: "Avg record confidence", value: stats.average_confidence },
    { label: "Documents processed", value: processedRate },
    { label: "Validation pass rate", value: Math.max(0, validationPass) },
  ];
}

const LANGUAGES = [
  { name: "Hindi", value: 62, color: "#0c2340" },
  { name: "English", value: 18, color: "#1a7f37" },
  { name: "Marathi", value: 10, color: "#e8750a" },
  { name: "Bengali", value: 6, color: "#64748b" },
  { name: "Other", value: 4, color: "#94a3b8" },
];

const DOC_TYPES = [
  { type: "Scanned PDF", count: 420 },
  { type: "Handwritten", count: 180 },
  { type: "Register", count: 310 },
  { type: "Map", count: 95 },
  { type: "Mixed", count: 140 },
];

export function AnalyticsInsights() {
  const { data, loading, error, reload } = useDashboardData();

  if (loading) {
    return <AppLayout title="Analytics"><LoadingState /></AppLayout>;
  }
  if (error || !data) {
    return <AppLayout title="Analytics"><ErrorState message={error || "Error"} onRetry={reload} /></AppLayout>;
  }

  return (
    <AppLayout title="Analytics">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gov-navy)]">Analytics</h1>
          <p className="text-sm text-[var(--gov-text-muted)] mt-1">
            Deeper extraction and language insights — operational status stays on the main dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {extractionKpis(data.stats).map((m) => (
            <div key={m.label} className="gov-card p-5 border-l-4 border-l-[var(--gov-saffron)]">
              <p className="text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">{m.label}</p>
              <p className="text-3xl font-bold text-[var(--gov-navy)] mt-1">{m.value}%</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Language distribution">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={LANGUAGES} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {LANGUAGES.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Document type">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={DOC_TYPES}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0c2340" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="District progress" className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.districtProgress.slice(0, 6).map((d) => (
                <div key={d.district} className="rounded-lg border border-[var(--gov-border-light)] p-4">
                  <p className="font-semibold text-[var(--gov-navy)]">{d.district}</p>
                  <p className="text-2xl font-bold text-[var(--gov-green)] mt-1">{d.percentage}%</p>
                  <div className="h-2 rounded-full bg-[var(--gov-border-light)] mt-2">
                    <div className="h-2 rounded-full bg-[var(--gov-green)]" style={{ width: `${d.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { formatConfidence } from "@/lib/utils";
import { DEMO_RECORD_ID } from "@/lib/record-ids";
import {
  FileText,
  Sparkles,
  Clock,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OverviewDashboardContent({ data }: { data: NonNullable<ReturnType<typeof useDashboardData>["data"]> }) {
  const { stats } = data;
  const accuracy = formatConfidence(stats.average_confidence / 100);
  const weekTrend = buildWeekTrend(data.processingChart);
  return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gov-navy)]">Home</h1>
            <p className="text-sm text-[var(--gov-text-muted)] mt-1 max-w-xl">
              Upload scans, run AI processing, verify records, and link parcels on the map.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/demo/workflow">
              <Button variant="outline">Guided demo</Button>
            </Link>
            <Link href="/documents/upload">
              <Button><Upload className="h-4 w-4" /> Upload</Button>
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/demo/workflow" className="gov-card p-4 hover:border-[var(--gov-saffron)] border-2 border-transparent transition-colors">
            <p className="text-xs font-bold uppercase text-[var(--gov-saffron)]">Start here</p>
            <p className="font-semibold text-[var(--gov-navy)] mt-1">Watch full workflow</p>
            <p className="text-xs text-[var(--gov-text-muted)] mt-1">Sign-up → enhancement → certification</p>
          </Link>
          <Link href="/documents/upload" className="gov-card p-4 hover:border-[var(--gov-navy)]/20 border-2 border-transparent transition-colors">
            <p className="text-xs font-bold uppercase text-[var(--gov-text-muted)]">Live</p>
            <p className="font-semibold text-[var(--gov-navy)] mt-1">Upload a document</p>
            <p className="text-xs text-[var(--gov-text-muted)] mt-1">PDF or image → quality → AI pipeline</p>
          </Link>
          <Link href={`/records/${DEMO_RECORD_ID}`} className="gov-card p-4 hover:border-[var(--gov-green)]/30 border-2 border-transparent transition-colors">
            <p className="text-xs font-bold uppercase text-[var(--gov-text-muted)]">Sample</p>
            <p className="font-semibold text-[var(--gov-navy)] mt-1">Verified record</p>
            <p className="text-xs text-[var(--gov-text-muted)] mt-1">{DEMO_RECORD_ID} · 360° view</p>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Documents processed"
            value={stats.processed_documents.toLocaleString()}
            icon={FileText}
            accent="navy"
          />
          <StatCard
            title="AI extraction accuracy"
            value={accuracy}
            icon={Sparkles}
            accent="green"
          />
          <StatCard
            title="Pending verification"
            value={stats.pending_verification.toLocaleString()}
            icon={Clock}
            accent="saffron"
          />
          <StatCard
            title="Validation issues"
            value={stats.validation_issues.toLocaleString()}
            icon={AlertTriangle}
            accent="amber"
          />
        </div>

        <WorkflowPipeline />

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Processing this week">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weekTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="documents" stroke="#0c2340" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Verification queue">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.verificationChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {data.verificationChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
  );
}

export function OverviewDashboard({ layoutTitle = "Dashboard" }: { layoutTitle?: string }) {
  const { data, loading, error, reload } = useDashboardData();

  if (loading) {
    return (
      <AppLayout title={layoutTitle}>
        <LoadingState message="Loading dashboard..." />
      </AppLayout>
    );
  }
  if (error || !data) {
    return (
      <AppLayout title={layoutTitle}>
        <ErrorState message={error || "Error"} onRetry={reload} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={layoutTitle}>
      <OverviewDashboardContent data={data} />
    </AppLayout>
  );
}

function buildWeekTrend(
  monthly: { month: string; processed: number }[]
) {
  const base = monthly.reduce((s, m) => s + m.processed, 0) || 42;
  return WEEKDAYS.map((day, i) => ({
    day,
    documents: Math.max(8, Math.round(base * (0.7 + (i % 5) * 0.08))),
  }));
}


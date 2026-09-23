"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/api-client";
import { formatDateShort, formatConfidence } from "@/lib/utils";
import type { DashboardStats, RecentDocument } from "@/types";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  Map,
  BarChart3,
} from "lucide-react";
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

interface DashboardData {
  stats: DashboardStats;
  stateProgress: { state: string; percentage: number; verified: number; total: number }[];
  districtProgress: { district: string; state: string; percentage: number }[];
  processingChart: { month: string; uploaded: number; processed: number; verified: number }[];
  verificationChart: { name: string; value: number; color: string }[];
  validationChart: { name: string; value: number; color: string }[];
  recentDocuments: RecentDocument[];
  recentVerification: { recordId: string; ownerName: string; action: string; timestamp: string }[];
  recentValidationIssues: { recordId: string; ownerName: string; score: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<DashboardData>("/api/dashboard");
      setData(result);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <AppLayout title="Dashboard"><LoadingState /></AppLayout>;
  if (error || !data) return <AppLayout title="Dashboard"><ErrorState message={error || "Error"} onRetry={load} /></AppLayout>;

  const { stats } = data;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-7">
        {/* Welcome strip */}
        <div className="gov-card border-l-4 border-l-[var(--gov-navy)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gov-text-muted)]">Overview</p>
            <h3 className="text-lg font-bold text-[var(--gov-navy)] mt-0.5">Land Record Digitization Dashboard</h3>
            <p className="text-sm text-[var(--gov-text-muted)] mt-0.5">Real-time statistics across document processing, verification, and validation</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/documents/upload"><Button size="sm"><Upload className="h-4 w-4" /> Upload Record</Button></Link>
            <Link href="/verification"><Button variant="outline" size="sm"><CheckCircle className="h-4 w-4" /> Verification Queue</Button></Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Documents" value={stats.total_documents.toLocaleString()} icon={FileText} accent="navy" />
          <StatCard title="Processed" value={stats.processed_documents.toLocaleString()} icon={BarChart3} accent="blue" />
          <StatCard title="Verified Records" value={stats.verified_records.toLocaleString()} icon={CheckCircle} accent="green" />
          <StatCard title="Pending Review" value={stats.pending_verification.toLocaleString()} icon={Clock} accent="saffron" />
          <StatCard title="Validation Issues" value={stats.validation_issues.toLocaleString()} icon={AlertTriangle} accent="amber" />
          <StatCard title="Avg Confidence" value={formatConfidence(stats.average_confidence / 100)} icon={CheckCircle} accent="green" />
        </div>

        <WorkflowPipeline />

        <div className="flex flex-wrap gap-2">
          <Link href="/gis"><Button variant="outline" size="sm"><Map className="h-4 w-4" /> GIS Map</Button></Link>
          <Link href="/records"><Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Land Records</Button></Link>
          <Link href="/audit"><Button variant="ghost" size="sm">Audit Logs</Button></Link>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Processing Statistics">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.processingChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="uploaded" fill="#64748b" name="Uploaded" />
                <Bar dataKey="processed" fill="#0c2340" name="Processed" />
                <Bar dataKey="verified" fill="#1a7f37" name="Verified" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card title="Verification Status">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.verificationChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {data.verificationChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Validation Status">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.validationChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {data.validationChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* Progress Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="State-wise Digitization Progress">
            {data.stateProgress.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-4">No records processed yet. Upload a document to begin.</p>
            ) : (
            <div className="space-y-3">
              {data.stateProgress.map((s) => (
                <div key={s.state}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[var(--gov-navy)]">{s.state}</span>
                    <span className="text-[var(--gov-text-muted)]">{s.percentage}% ({s.verified}/{s.total})</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--gov-border-light)]">
                    <div className="h-2 rounded-full bg-[var(--gov-navy)] transition-all" style={{ width: `${s.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
            )}
          </Card>

          <Card title="District-wise Progress">
            {data.districtProgress.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-4">No district data yet.</p>
            ) : (
            <div className="space-y-3">
              {data.districtProgress.map((d) => (
                <div key={d.district}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-[var(--gov-navy)]">{d.district}, {d.state}</span>
                    <span className="text-[var(--gov-text-muted)]">{d.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--gov-border-light)]">
                    <div className="h-2 rounded-full bg-[var(--gov-navy-light)] transition-all" style={{ width: `${d.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card title="Recent Documents">
            <DataTable
              keyField="id"
              data={data.recentDocuments}
              columns={[
                { key: "name", header: "Document", render: (d) => <span className="truncate max-w-[180px] block">{d.name}</span> },
                { key: "status", header: "Status", render: (d) => <ProcessingStatusBadge status={d.status} /> },
                { key: "uploadedAt", header: "Date", render: (d) => formatDateShort(d.uploadedAt) },
              ]}
              onRowClick={(d) => window.location.href = `/documents/${d.id}`}
            />
          </Card>

          <Card title="Recent Verification Activity">
            {data.recentVerification.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-4">No recent verification activity</p>
            ) : (
              <div className="space-y-3">
                {data.recentVerification.map((item) => (
                  <Link
                    key={item.recordId}
                    href={`/verification/${item.recordId}`}
                    className="flex items-center justify-between rounded-md border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] p-3 hover:bg-white transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--gov-navy)]">{item.ownerName}</p>
                      <p className="text-xs text-[var(--gov-text-muted)]">{item.recordId}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold uppercase text-[var(--gov-saffron)]">{item.action}</span>
                      <p className="text-xs text-[var(--gov-text-muted)] mt-0.5">{formatDateShort(item.timestamp)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Recent Validation Warnings">
            {data.recentValidationIssues.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)] py-4">No recent validation issues</p>
            ) : (
              <div className="space-y-3">
                {data.recentValidationIssues.map((issue) => (
                  <Link
                    key={issue.recordId}
                    href={`/records/${issue.recordId}`}
                    className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--gov-navy)]">{issue.ownerName}</p>
                      <p className="text-xs text-[var(--gov-text-muted)]">{issue.recordId}</p>
                    </div>
                    <span className="text-sm font-medium text-amber-700">Score: {issue.score}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

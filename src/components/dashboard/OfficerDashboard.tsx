"use client";

import Link from "next/link";
import type { OfficerDashboardVariant } from "@/lib/dashboard-routes";
import { DASHBOARD_META } from "@/lib/dashboard-routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { DashboardHero, DashboardSection } from "@/components/dashboard/DashboardHero";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { formatDateShort, formatConfidence } from "@/lib/utils";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  Map,
  BarChart3,
  Shield,
  Layers,
  LayoutGrid,
  ScanLine,
} from "lucide-react";
import { RequirementCoverageSummary } from "@/components/study/RequirementCoverage";
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

const VARIANT_ICON = {
  admin: LayoutGrid,
  operations: ScanLine,
  verification: Shield,
  survey: Map,
};

export function OfficerDashboard({ variant }: { variant: OfficerDashboardVariant }) {
  const meta = DASHBOARD_META[variant];
  const { data, loading, error, reload } = useDashboardData();

  if (loading) {
    return (
      <AppLayout title={meta.title}>
        <LoadingState message="Loading dashboard..." />
      </AppLayout>
    );
  }
  if (error || !data) {
    return (
      <AppLayout title={meta.title}>
        <ErrorState message={error || "Error"} onRetry={reload} />
      </AppLayout>
    );
  }

  const { stats } = data;
  const Icon = VARIANT_ICON[variant];

  const heroActions = heroActionsFor(variant);
  const kpis = kpisFor(variant, stats);

  return (
    <AppLayout title={meta.title}>
      <div className="space-y-8">
        <DashboardHero
          eyebrow="Dharohar LRMS"
          title={meta.title}
          description={meta.subtitle}
          icon={Icon}
          accent={variant === "verification" ? "saffron" : variant === "survey" ? "green" : "navy"}
          actions={heroActions}
        />

        {variant === "admin" && <RequirementCoverageSummary />}

        {variant === "admin" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(DASHBOARD_META) as OfficerDashboardVariant[]).map((key) => (
              <Link
                key={key}
                href={DASHBOARD_META[key].path}
                className="dashboard-portal-card group"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gov-text-muted)]">
                  Portal
                </p>
                <p className="text-sm font-bold text-[var(--gov-navy)] mt-1 group-hover:text-[var(--gov-navy-light)]">
                  {DASHBOARD_META[key].title}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <StatCard key={kpi.title} {...kpi} />
          ))}
        </div>

        {(variant === "admin" || variant === "operations") && <WorkflowPipeline />}

        <div className="grid lg:grid-cols-2 gap-6">
          {(variant === "admin" || variant === "operations") && (
            <Card title="Processing throughput">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.processingChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="uploaded" fill="#94a3b8" name="Uploaded" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="processed" fill="#0c2340" name="Processed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="verified" fill="#1a7f37" name="Verified" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {(variant === "admin" || variant === "verification") && (
            <Card title="Verification mix">
              <ResponsiveContainer width="100%" height={260}>
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
          )}

          {(variant === "admin" || variant === "verification") && (
            <Card title="Validation outcomes">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.validationChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {data.validationChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {(variant === "admin" || variant === "survey") && (
            <Card title="District digitization coverage">
              {data.districtProgress.length === 0 ? (
                <p className="text-sm text-[var(--gov-text-muted)] py-6">No district data yet.</p>
              ) : (
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {data.districtProgress.map((d) => (
                    <div key={d.district}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-[var(--gov-navy)]">{d.district}</span>
                        <span className="text-[var(--gov-text-muted)]">{d.percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--gov-border-light)]">
                        <div
                          className="h-2 rounded-full bg-[var(--gov-green)] transition-all"
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {(variant === "admin" || variant === "operations") && (
            <Card title="Recent uploads" className="lg:col-span-2">
              <DataTable
                keyField="id"
                data={data.recentDocuments}
                columns={[
                  { key: "name", header: "Document", render: (d) => <span className="truncate max-w-[200px] block">{d.name}</span> },
                  { key: "status", header: "Status", render: (d) => <ProcessingStatusBadge status={d.status} /> },
                  { key: "uploadedAt", header: "Date", render: (d) => formatDateShort(d.uploadedAt) },
                ]}
                onRowClick={(d) => { window.location.href = `/documents/${d.id}`; }}
              />
            </Card>
          )}

          {(variant === "admin" || variant === "verification") && (
            <Card title="Verification queue">
              {data.recentVerification.length === 0 ? (
                <p className="text-sm text-[var(--gov-text-muted)] py-4">Queue is empty.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentVerification.map((item) => (
                    <Link
                      key={item.recordId}
                      href={`/verification/${item.recordId}`}
                      className="block rounded-lg border border-[var(--gov-border-light)] p-3 hover:bg-[var(--gov-bg-subtle)] transition-colors"
                    >
                      <p className="text-sm font-semibold text-[var(--gov-navy)]">{item.ownerName}</p>
                      <p className="text-xs text-[var(--gov-text-muted)]">{formatDateShort(item.timestamp)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {(variant === "admin" || variant === "verification") && (
            <Card title="Validation alerts">
              {data.recentValidationIssues.length === 0 ? (
                <p className="text-sm text-[var(--gov-text-muted)] py-4">No open issues.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentValidationIssues.map((issue) => (
                    <Link
                      key={issue.recordId}
                      href={`/records/${issue.recordId}`}
                      className="block rounded-lg border border-amber-200 bg-amber-50/80 p-3 hover:bg-amber-50"
                    >
                      <p className="text-sm font-medium text-[var(--gov-navy)]">{issue.ownerName}</p>
                      <p className="text-xs text-amber-800">Score: {issue.score}</p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {(variant === "survey" || variant === "admin") && (
            <Card title="State-wise progress" className="lg:col-span-2">
              {data.stateProgress.length === 0 ? (
                <p className="text-sm text-[var(--gov-text-muted)] py-4">No state aggregates yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.stateProgress.map((s) => (
                    <div key={s.state} className="rounded-lg border border-[var(--gov-border-light)] p-4">
                      <p className="font-semibold text-[var(--gov-navy)]">{s.state}</p>
                      <p className="text-2xl font-bold text-[var(--gov-green)] mt-1">{s.percentage}%</p>
                      <p className="text-xs text-[var(--gov-text-muted)]">{s.verified} / {s.total} verified</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {variant === "survey" && (
          <DashboardSection title="Spatial tools" description="Open map and parcel-linked records">
            <div className="flex flex-wrap gap-3">
              <Link href="/gis"><Button><Map className="h-4 w-4" /> Open GIS map</Button></Link>
              <Link href="/records"><Button variant="outline"><Layers className="h-4 w-4" /> Browse records</Button></Link>
            </div>
          </DashboardSection>
        )}
      </div>
    </AppLayout>
  );
}

function heroActionsFor(variant: OfficerDashboardVariant) {
  switch (variant) {
    case "operations":
      return [
        { href: "/documents/upload", label: "Upload document", icon: Upload },
        { href: "/documents", label: "All documents", icon: FileText, variant: "outline" as const },
      ];
    case "verification":
      return [
        { href: "/verification", label: "Review queue", icon: CheckCircle },
        { href: "/validation", label: "Validation", icon: AlertTriangle, variant: "outline" as const },
      ];
    case "survey":
      return [
        { href: "/gis", label: "GIS map", icon: Map },
        { href: "/records", label: "Records", icon: FileText, variant: "outline" as const },
      ];
    default:
      return [
        { href: "/documents/upload", label: "Upload", icon: Upload },
        { href: "/users", label: "Users", icon: Shield, variant: "outline" as const },
      ];
  }
}

function kpisFor(
  variant: OfficerDashboardVariant,
  stats: import("@/types").DashboardStats
) {
  const all = {
    docs: { title: "Documents", value: stats.total_documents.toLocaleString(), icon: FileText, accent: "navy" as const },
    processed: { title: "Processed", value: stats.processed_documents.toLocaleString(), icon: BarChart3, accent: "blue" as const },
    verified: { title: "Verified", value: stats.verified_records.toLocaleString(), icon: CheckCircle, accent: "green" as const },
    pending: { title: "Pending review", value: stats.pending_verification.toLocaleString(), icon: Clock, accent: "saffron" as const },
    issues: { title: "Validation issues", value: stats.validation_issues.toLocaleString(), icon: AlertTriangle, accent: "amber" as const },
    confidence: { title: "Avg confidence", value: formatConfidence(stats.average_confidence / 100), icon: CheckCircle, accent: "green" as const },
  };

  switch (variant) {
    case "operations":
      return [all.docs, all.processed, all.pending, all.confidence];
    case "verification":
      return [all.pending, all.issues, all.verified, all.confidence];
    case "survey":
      return [all.verified, all.processed, all.docs, all.confidence];
    default:
      return [all.docs, all.processed, all.verified, all.pending, all.issues, all.confidence];
  }
}

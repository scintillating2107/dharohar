"use client";

import Link from "next/link";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { StatCard, BarList } from "@/components/dashboard/StatCard";
import { useDashboardData, type DashboardData } from "@/components/dashboard/useDashboardData";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { ProcessingStatusBadge } from "@/components/ui/StatusBadges";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { hasPermission, type Permission } from "@/lib/config";
import { intlLocale } from "@/lib/i18n";
import { formatDateShort, formatRole } from "@/lib/utils";
import {
  FileText,
  Sparkles,
  Clock,
  AlertTriangle,
  Upload,
  CheckSquare,
  XCircle,
  CheckCircle,
  MapPinned,
  Hourglass,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { UserRole } from "@/types";

const ROLE_SUBTITLE: Record<UserRole, string> = {
  ADMIN: "Platform health, throughput and data quality across all districts.",
  DATA_OFFICER: "Your uploads and the documents that need attention.",
  VERIFICATION_OFFICER: "Records waiting for your review, highest priority first.",
  SURVEY_OFFICER: "Verified plots and the parcels that still need a surveyed boundary.",
  CITIZEN: "",
};

const SEVERITY_DOT = { high: "bg-red-500", medium: "bg-[var(--gov-saffron)]", info: "bg-[var(--gov-navy-light)]" };

function formatWait(hours: number | null, t: (s: string, v?: Record<string, number>) => string): string {
  if (hours === null) return "—";
  if (hours < 1) return t("< 1 h");
  if (hours < 48) return t("{n} h", { n: hours });
  return t("{n} days", { n: Math.round(hours / 24) });
}

function Kpis({ data, role }: { data: DashboardData; role: UserRole }) {
  const { t } = useLocale();
  const s = data.stats;
  const accuracy = s.extraction_accuracy === null ? "—" : `${s.extraction_accuracy}%`;
  const cards = {
    processed: <StatCard key="processed" title="Documents processed" value={`${s.processed_documents} / ${s.total_documents}`} icon={FileText} href="/documents" />,
    pending: <StatCard key="pending" title="Pending verification" value={s.pending_verification} icon={Clock} accent="saffron" href="/verification" />,
    accuracy: (
      <StatCard
        key="accuracy"
        title="Extraction accuracy"
        value={accuracy}
        subtitle={s.extraction_accuracy === null ? "Measured after first approvals" : "Fields accepted unchanged by officers"}
        icon={Sparkles}
        accent="green"
        href={hasPermission(role, "analytics") ? "/analytics" : undefined}
      />
    ),
    failed: (
      <StatCard key="failed" title="Failed processing" value={s.failed_documents} icon={XCircle} accent={s.failed_documents ? "red" : "blue"} href="/documents?status=FAILED" />
    ),
    issues: <StatCard key="issues" title="Validation issues" value={s.validation_issues} subtitle="Open records" icon={AlertTriangle} accent="amber" href="/validation" />,
    verified: <StatCard key="verified" title="Verified records" value={s.verified_records} icon={CheckCircle} accent="green" href="/records?status=VERIFIED" />,
    waiting: <StatCard key="waiting" title="Oldest waiting" value={formatWait(data.attention.oldestPendingHours, t)} icon={Hourglass} accent="blue" href="/verification" />,
    unsurveyed: (
      <StatCard key="unsurveyed" title="Without surveyed boundary" value={data.attention.unsurveyedVerified ?? 0} icon={MapPinned} accent="saffron" href="/gis?geometry=approximate" />
    ),
    awaiting: <StatCard key="awaiting" title="Awaiting verification" value={s.pending_verification} icon={Clock} accent="saffron" href="/documents?status=VERIFICATION_REQUIRED" />,
  };
  const byRole: Record<UserRole, (keyof typeof cards)[]> = {
    ADMIN: ["processed", "pending", "accuracy", "failed"],
    DATA_OFFICER: ["processed", "awaiting", "failed", "issues"],
    VERIFICATION_OFFICER: ["pending", "waiting", "issues", "accuracy"],
    SURVEY_OFFICER: ["verified", "unsurveyed", "processed", "accuracy"],
    CITIZEN: [],
  };
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{byRole[role].map((k) => cards[k])}</div>;
}

function Attention({ data }: { data: DashboardData }) {
  const { t, tx } = useLocale();
  const items = data.attention.items;
  return (
    <Card title="Needs your attention" action={items.length > 0 ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{items.length}</span> : undefined}>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 text-[var(--gov-text-muted)]">
          <PartyPopper className="h-6 w-6 text-[var(--gov-green)] flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">{t("Nothing is waiting for you right now.")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--gov-border-light)] -my-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center gap-3 py-2.5 group">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[item.severity]}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--gov-navy)] group-hover:underline truncate">{tx(item.title)}</span>
                  {item.detail && <span className="block text-xs text-[var(--gov-text-muted)] truncate">{tx(item.detail)}</span>}
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--gov-text-light)] flex-shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Trend({ data }: { data: DashboardData }) {
  const { t, locale } = useLocale();
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });
  const series = data.dailyTrend.map((d) => ({ ...d, label: d.date ? fmt.format(new Date(`${d.date}T00:00:00`)) : d.day }));
  const uploaded = series.reduce((s, d) => s + d.uploaded, 0);
  const verified = series.reduce((s, d) => s + d.verified, 0);
  return (
    <Card
      title="Last 14 days"
      action={
        <span className="flex items-center gap-3 text-xs text-[var(--gov-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--gov-navy)]" aria-hidden="true" />
            {t("Uploaded")} <strong className="text-[var(--gov-navy)]">{uploaded}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--gov-green)]" aria-hidden="true" />
            {t("Verified")} <strong className="text-[var(--gov-navy)]">{verified}</strong>
          </span>
        </span>
      }
    >
      {uploaded + verified === 0 ? (
        <p className="text-sm text-[var(--gov-text-muted)] py-6 text-center">{t("No uploads or verifications in the last 14 days.")}</p>
      ) : (
        <div className="h-[190px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ left: -24, right: 4, top: 4 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(12,35,64,0.05)" }} />
              <Bar dataKey="uploaded" name={t("Uploaded")} fill="#0c2340" radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Bar dataKey="verified" name={t("Verified")} fill="#1a7f37" radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function RecentUploads({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const items = data.recentDocuments.slice(0, 5);
  return (
    <Card
      title="Recent uploads"
      action={
        <Link href="/documents" className="text-xs font-semibold text-[var(--gov-navy-light)] hover:underline">
          {t("View all")}
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-[var(--gov-text-muted)] text-center">{t("Nothing uploaded yet.")}</p>
      ) : (
        <ul className="divide-y divide-[var(--gov-border-light)] -my-2">
          {items.map((d) => (
            <li key={d.id}>
              <Link href={`/documents/${d.id}`} className="py-2.5 flex items-center justify-between gap-3 group">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--gov-navy)] truncate group-hover:underline">{d.name}</span>
                  <span className="block text-xs text-[var(--gov-text-muted)]">
                    {d.uploadedBy} · {formatDateShort(d.uploadedAt)}
                  </span>
                </span>
                <ProcessingStatusBadge status={d.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function OverviewContent({ data, role, name }: { data: DashboardData; role: UserRole; name: string }) {
  const { t } = useLocale();
  const can = (p: Permission) => hasPermission(role, p);
  const v = Object.fromEntries(data.verificationChart.map((x) => [x.name, x.value]));
  const vstat = Object.fromEntries(data.validationChart.map((x) => [x.name, x.value]));

  const outcomes = (
    <Card title="Outcomes">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mb-2">{t("Verification")}</p>
      <BarList
        empty="No verification tasks yet."
        items={[
          { label: "Approved", value: v.Approved ?? 0, color: "#1a7f37" },
          { label: "Pending", value: v.Pending ?? 0, color: "#e8750a", href: can("verification") ? "/verification" : undefined },
          { label: "Rejected", value: v.Rejected ?? 0, color: "#dc2626" },
          { label: "Sent back", value: v["Sent back"] ?? 0, color: "#64748b" },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)] mt-5 mb-2">{t("Validation")}</p>
      <BarList
        empty="No records validated yet."
        items={[
          { label: "Valid", value: vstat.Valid ?? 0, color: "#1a7f37" },
          { label: "Review required", value: vstat["Review required"] ?? 0, color: "#e8750a" },
          { label: "Invalid", value: vstat.Invalid ?? 0, color: "#dc2626" },
        ]}
      />
    </Card>
  );
  const issues = (
    <Card title="Most common data issues">
      <BarList empty="No validation issues recorded." color="#e8750a" items={data.errorCategories.slice(0, 5).map((c) => ({ label: c.name, value: c.count }))} />
    </Card>
  );
  const districts = (can("gis") || role === "ADMIN") && (
    <Card title="District progress">
      <BarList
        empty="No records yet."
        color="#1a7f37"
        suffix="%"
        max={100}
        items={data.districtProgress.slice(0, 6).map((d) => ({
          label: t("{district} — {verified} of {total} verified", { district: t(d.district), verified: d.verified, total: d.total }),
          value: d.percentage,
        }))}
      />
    </Card>
  );

  return (
    <div className="space-y-5">
      <PageTitle
        title={t("Welcome, {name}", { name: name.split(" ")[0] })}
        description={ROLE_SUBTITLE[role]}
        actions={
          <>
            {can("verification") && (
              <Link href="/verification">
                <Button variant="outline">
                  <CheckSquare className="h-4 w-4" /> {t("Verification queue")}
                </Button>
              </Link>
            )}
            {can("upload") && (
              <Link href="/documents/upload">
                <Button>
                  <Upload className="h-4 w-4" /> {t("Upload")}
                </Button>
              </Link>
            )}
            {can("gis_edit") && !can("upload") && (
              <Link href="/gis">
                <Button>
                  <MapPinned className="h-4 w-4" /> {t("Open map")}
                </Button>
              </Link>
            )}
          </>
        }
      />

      <p className="sr-only">{t(formatRole(role))}</p>
      <Kpis data={data} role={role} />

      {/* Two independent columns: cards keep their natural height (no stretched empty boxes) */}
      <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <Attention data={data} />
          <Trend data={data} />
          {can("documents") && <RecentUploads data={data} />}
        </div>
        <div className="space-y-5 min-w-0">
          {outcomes}
          {issues}
          {districts}
        </div>
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  const { data, loading, error, reload } = useDashboardData();
  const { user } = useAuth();
  return (
    <AppLayout title="Dashboard">
      {loading || !user ? (
        <LoadingState message="Loading dashboard…" />
      ) : !data ? (
        <ErrorState message={error || "Could not load dashboard"} onRetry={reload} />
      ) : (
        <OverviewContent data={data} role={user.role} name={user.name} />
      )}
    </AppLayout>
  );
}

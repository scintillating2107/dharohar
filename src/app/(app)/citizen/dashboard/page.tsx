"use client";

import Link from "next/link";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { RecordStatusBadge } from "@/components/ui/StatusBadges";
import { ClaimRecordButton } from "@/components/records/ClaimRecordButton";
import { useApi } from "@/lib/use-api";
import { formatDateShort, formatArea } from "@/lib/utils";
import type { RecordStatus } from "@/types";
import { Home, CheckCircle, Clock, Landmark, Search, MapPin } from "lucide-react";

interface CitizenData {
  user: { name: string; district: string; email: string };
  stats: { my_records: number; my_verified: number; pending_claims: number; district_verified_total: number };
  myRecords: { recordId: string; ownerName: string; khasraNumber: string; village: string; district: string; status: RecordStatus; updatedAt: string }[];
  claims: { id: string; recordId: string; relationship: string; status: string; reviewComment: string | null; createdAt: string; ownerName: string | null; village: string | null }[];
  publicVerified: { recordId: string; ownerName: string; khasraNumber: string; village: string; tehsil: string; district: string; area: number; areaUnit: string; verifiedAt: string }[];
}

export default function CitizenDashboardPage() {
  const { t } = useLocale();
  const { data, error, initialLoading, reload } = useApi<CitizenData>("/api/citizen/dashboard");
  const statusLabel: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };

  if (initialLoading) return <AppLayout title="Citizen portal"><LoadingState /></AppLayout>;
  if (!data) return <AppLayout title="Citizen portal"><ErrorState message={error || "Could not load"} onRetry={reload} /></AppLayout>;

  return (
    <AppLayout title="Citizen portal">
      <div className="space-y-8">
        <PageTitle
          title={t("Namaste, {name}", { name: data.user.name })}
          description={t("Your land records, ownership claims and verified records in {district}.", { district: t(data.user.district) })}
          actions={
            <div className="flex flex-wrap gap-2">
              <ClaimRecordButton onDone={reload} />
              <Link href="/records"><Button variant="outline" size="sm"><Search className="h-4 w-4" /> {t("Search records")}</Button></Link>
            </div>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="My records" value={data.stats.my_records} icon={Home} accent="navy" />
          <StatCard title="Verified" value={data.stats.my_verified} icon={CheckCircle} accent="green" />
          <StatCard title="Claims pending" value={data.stats.pending_claims} icon={Clock} accent="saffron" />
          <StatCard title="Verified in district" value={data.stats.district_verified_total} icon={Landmark} accent="blue" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <Card title="My land records">
            {data.myRecords.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)]">
                {t("No records linked yet. Find your record (search by khasra or village), then use “This is my land” to claim it.")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--gov-border-light)]">
                {data.myRecords.map((r) => (
                  <li key={r.recordId} className="py-2.5 flex items-center justify-between gap-3">
                    <Link href={`/records/${r.recordId}`} className="min-w-0">
                      <p className="font-medium text-[var(--gov-navy)]">{t("Khasra")} {r.khasraNumber} · {t(r.village)}</p>
                      <p className="text-xs text-[var(--gov-text-muted)] font-mono">{r.recordId}</p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <RecordStatusBadge status={r.status} />
                      {r.status === "VERIFIED" && (
                        <Link href={`/verify/${r.recordId}?print=1`} target="_blank" className="text-xs font-semibold text-[var(--gov-navy-light)]">{t("Certificate")}</Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="My claims">
            {data.claims.length === 0 ? (
              <p className="text-sm text-[var(--gov-text-muted)]">{t("You have not submitted any claims.")}</p>
            ) : (
              <ul className="divide-y divide-[var(--gov-border-light)]">
                {data.claims.map((c) => (
                  <li key={c.id} className="py-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>
                        <span className="font-mono">{c.recordId}</span> · {t(c.relationship)}
                      </span>
                      <Badge variant={c.status === "APPROVED" ? "success" : c.status === "REJECTED" ? "error" : "warning"}>{t(statusLabel[c.status] ?? c.status)}</Badge>
                    </div>
                    <p className="text-xs text-[var(--gov-text-muted)]">
                      {t("Submitted {date}", { date: formatDateShort(c.createdAt) })}
                      {c.reviewComment ? ` · ${c.reviewComment}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title={t("Recently verified in {district}", { district: t(data.user.district) })}>
          {data.publicVerified.length === 0 ? (
            <p className="text-sm text-[var(--gov-text-muted)]">{t("No verified records yet.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-[var(--gov-text-muted)]">
                    <th className="py-2 pr-3">{t("Record")}</th><th className="pr-3">{t("Khasra")}</th><th className="pr-3">{t("Village")}</th><th className="pr-3">{t("Area")}</th><th className="pr-3">{t("Verified")}</th><th />
                  </tr>
                </thead>
                <tbody>
                  {data.publicVerified.map((r) => (
                    <tr key={r.recordId} className="border-t border-[var(--gov-border-light)]">
                      <td className="py-2 font-mono text-xs"><Link href={`/records/${r.recordId}`} className="text-[var(--gov-navy-light)]">{r.recordId}</Link></td>
                      <td>{r.khasraNumber}</td>
                      <td className="pr-3">{t(r.village)}, {t(r.tehsil)}</td>
                      <td>{formatArea(r.area, r.areaUnit)}</td>
                      <td>{formatDateShort(r.verifiedAt)}</td>
                      <td><Link href={`/gis?record=${r.recordId}`} aria-label={t("Show on map")}><MapPin className="h-4 w-4 text-[var(--gov-navy-light)]" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

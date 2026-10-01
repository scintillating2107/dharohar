"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { apiGet, ApiError } from "@/lib/api-client";
import { formatDateShort } from "@/lib/utils";
import {
  Home,
  FileSearch,
  MapPin,
  CheckCircle,
  Clock,
  Landmark,
  ArrowRight,
  Shield,
} from "lucide-react";
import { DashboardHero, DashboardSection } from "@/components/dashboard/DashboardHero";

interface CitizenDashboardData {
  user: { name: string; district: string; email: string };
  stats: {
    my_records: number;
    my_verified: number;
    pending_actions: number;
    district_verified_total: number;
    my_applications: number;
  };
  myRecords: {
    recordId: string;
    ownerName: string;
    khasraNumber: string;
    village: string;
    district: string;
    status: string;
    updatedAt: string;
  }[];
  myApplications: {
    id: string;
    name: string;
    status: string;
    uploadedAt: string;
  }[];
  publicVerified: {
    recordId: string;
    ownerName: string;
    khasraNumber: string;
    village: string;
    tehsil: string;
    district: string;
    area: number;
    areaUnit: string;
    verifiedAt: string;
  }[];
  services: { title: string; description: string; href: string }[];
}

function statusBadge(status: string) {
  if (status === "VERIFIED") return <Badge variant="success">Verified</Badge>;
  if (status === "VERIFICATION_REQUIRED") return <Badge variant="warning">Under review</Badge>;
  if (status === "REJECTED") return <Badge variant="error">Rejected</Badge>;
  return <Badge variant="neutral">{status.replace(/_/g, " ")}</Badge>;
}

export default function CitizenDashboardPage() {
  const [data, setData] = useState<CitizenDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<CitizenDashboardData>("/api/citizen/dashboard");
      setData(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("This page is for citizen accounts. Sign out and use citizen@dharohar.gov / citizen123.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not load your dashboard. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Citizen Portal">
        <LoadingState message="Loading your dashboard..." />
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout title="Citizen Portal">
        <ErrorState message={error || "Error"} onRetry={load} />
      </AppLayout>
    );
  }

  const { user, stats } = data;

  return (
    <AppLayout title="Citizen Portal">
      <div className="space-y-8">
        <DashboardHero
          eyebrow="Citizen services"
          title={`Welcome, ${user.name}`}
          description={`${user.district} district — view verified records, track your land holdings, and access public services.`}
          icon={Home}
          accent="saffron"
          actions={[
            { href: "/records?status=VERIFIED", label: "Search records", icon: FileSearch },
            { href: "/gis", label: "GIS map", icon: MapPin, variant: "outline" },
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My land records"
            value={stats.my_records}
            icon={Home}
            accent="navy"
          />
          <StatCard
            title="Verified holdings"
            value={stats.my_verified}
            icon={CheckCircle}
            accent="green"
          />
          <StatCard
            title="Pending review"
            value={stats.pending_actions}
            icon={Clock}
            accent="saffron"
          />
          <StatCard
            title="Verified in district"
            value={stats.district_verified_total}
            icon={Landmark}
            accent="blue"
          />
        </div>

        <DashboardSection title="Your services & records">
        <div className="grid lg:grid-cols-3 gap-6">
          <Card title="Quick services" className="lg:col-span-1">
            <ul className="space-y-3">
              {data.services.map((s) => (
                <li key={s.title}>
                  <Link
                    href={s.href}
                    className="block rounded-lg border border-[var(--gov-border-light)] p-3 hover:border-[var(--gov-navy-light)] hover:bg-[var(--gov-bg-subtle)] transition-colors"
                  >
                    <p className="text-sm font-semibold text-[var(--gov-navy)]">{s.title}</p>
                    <p className="text-xs text-[var(--gov-text-muted)] mt-1">{s.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="My land records" className="lg:col-span-2">
            {data.myRecords.length === 0 ? (
              <div className="py-8 text-center">
                <Shield className="h-10 w-10 text-[var(--gov-text-light)] mx-auto mb-3" />
                <p className="text-sm text-[var(--gov-text-muted)]">
                  No records are linked to your profile yet. Records appear here when the
                  registered owner name matches your account name ({user.name}).
                </p>
                <Link href="/records?status=VERIFIED" className="inline-block mt-4">
                  <Button variant="outline" size="sm">Browse verified records</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data.myRecords.map((r) => (
                  <Link
                    key={r.recordId}
                    href={`/records/${r.recordId}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-[var(--gov-border-light)] p-3 hover:bg-[var(--gov-bg-subtle)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--gov-navy)]">
                        Khasra {r.khasraNumber} — {r.village}
                      </p>
                      <p className="text-xs text-[var(--gov-text-muted)]">
                        {r.recordId} · Updated {formatDateShort(r.updatedAt)}
                      </p>
                    </div>
                    {statusBadge(r.status)}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
        </DashboardSection>

        <Card title={`Recently verified in ${user.district}`}>
          {data.publicVerified.length === 0 ? (
            <p className="text-sm text-[var(--gov-text-muted)] py-4">
              No verified public records in your district yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--gov-text-muted)] border-b border-[var(--gov-border-light)]">
                    <th className="pb-2 font-medium">Owner</th>
                    <th className="pb-2 font-medium">Khasra</th>
                    <th className="pb-2 font-medium">Village</th>
                    <th className="pb-2 font-medium">Area</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.publicVerified.map((r) => (
                    <tr key={r.recordId} className="border-b border-[var(--gov-border-light)] last:border-0">
                      <td className="py-2.5 font-medium text-[var(--gov-navy)]">{r.ownerName}</td>
                      <td className="py-2.5">{r.khasraNumber}</td>
                      <td className="py-2.5">{r.village}</td>
                      <td className="py-2.5">{r.area} {r.areaUnit}</td>
                      <td className="py-2.5 text-right">
                        <Link
                          href={`/records/${r.recordId}`}
                          className="text-[var(--gov-navy-light)] hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {data.myApplications.length > 0 && (
          <Card title="My uploaded documents">
            <div className="space-y-2">
              {data.myApplications.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-[var(--gov-border-light)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--gov-navy)]">{d.name}</p>
                    <p className="text-xs text-[var(--gov-text-muted)]">
                      {formatDateShort(d.uploadedAt)}
                    </p>
                  </div>
                  {statusBadge(d.status)}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

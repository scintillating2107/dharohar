"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { DashboardHero, DashboardSection } from "@/components/dashboard/DashboardHero";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { LoadingState } from "@/components/ui/States";
import { FIELD_LABELS } from "@/lib/config";
import {
  STUDY_TITLE,
  STUDY_TAGLINE,
  STUDY_PILLARS,
  EXTRACTED_FIELD_GROUPS,
  STAKEHOLDERS,
  SUGGESTED_TECH_STACK,
  DASHBOARD_METRICS_STUDY,
  EXPECTED_SOLUTION_ITEMS,
} from "@/lib/study-spec";
import { apiGet } from "@/lib/api-client";
import { BookOpen, ExternalLink, Cpu, CheckCircle2 } from "lucide-react";
import { RequirementCoverageGrid, DemoWalkthrough } from "@/components/study/RequirementCoverage";
import { solutionRequirementStats } from "@/lib/solution-requirements";
import { Button } from "@/components/ui/Button";

interface HealthResponse {
  mock_mode: boolean;
  modules: Record<string, { status: string; url?: string }>;
}

export function SolutionOverview() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    apiGet<HealthResponse>("/api/integrations/health")
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const stats = solutionRequirementStats();

  return (
    <AppLayout title="About the system">
      <div className="space-y-8 max-w-5xl">
        <DashboardHero
          eyebrow="Land record modernization"
          title={STUDY_TITLE}
          description={STUDY_TAGLINE}
          icon={BookOpen}
          accent="navy"
          actions={[
            {
              href: "https://dilrmp.gov.in/",
              label: "DILRMP context",
              icon: ExternalLink,
              variant: "outline",
            },
          ]}
        />

        <Card title="Platform capabilities">
          <p className="text-sm text-[var(--gov-text-muted)] mb-4">
            {stats.implemented} modules in production use, {stats.partial} with staged integrations,{" "}
            {stats.roadmap} planned enhancements.
          </p>
          <RequirementCoverageGrid />
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Officer workflows">
            <DemoWalkthrough />
          </Card>
          <Card title="Deployment notes">
            <p className="text-sm text-[var(--gov-text-muted)] leading-relaxed">
              Configure integration keys in <code className="text-xs bg-[var(--gov-bg-subtle)] px-1 rounded">.env.local</code>{" "}
              for live OCR and extraction services. Standard path: upload → quality check → processing → verification.
            </p>
          </Card>
        </div>

        <DashboardSection
          title="End-to-end digitization pipeline"
          description="Upload → computer vision → OCR/NLP → field extraction → validation → human verification → verified record → GIS"
        >
          <WorkflowPipeline />
        </DashboardSection>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Expected solution capabilities">
            <ul className="space-y-2 mb-6 text-sm text-[var(--gov-text-muted)]">
              {EXPECTED_SOLUTION_ITEMS.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--gov-green)] flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--gov-text-muted)] mb-3">
              Platform pillars
            </p>
            <ul className="space-y-4">
              {STUDY_PILLARS.map((p) => (
                <li key={p.title}>
                  <p className="text-sm font-semibold text-[var(--gov-navy)]">{p.title}</p>
                  <p className="text-xs text-[var(--gov-text-muted)] mt-1 leading-relaxed">{p.description}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Predefined extraction fields">
            <div className="space-y-4">
              {EXTRACTED_FIELD_GROUPS.map((g) => (
                <div key={g.group}>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--gov-text-muted)]">
                    {g.group}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {g.fields.map((key) => (
                      <span
                        key={key}
                        className="text-xs rounded-md border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] px-2 py-1 text-[var(--gov-navy)]"
                      >
                        {FIELD_LABELS[key] ?? key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Stakeholders served">
            <ul className="list-disc list-inside text-sm text-[var(--gov-text-muted)] space-y-1">
              {STAKEHOLDERS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Card>

          <Card title="Dashboard metrics">
            <ul className="space-y-2">
              {DASHBOARD_METRICS_STUDY.map((m) => (
                <li key={m} className="text-sm text-[var(--gov-navy)] flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--gov-saffron)]" />
                  {m}
                </li>
              ))}
            </ul>
            <Link href="/dashboard/admin" className="inline-block mt-4">
              <Button size="sm" variant="outline">Open command center</Button>
            </Link>
          </Card>
        </div>

        <Card title="Component-wise technology">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--gov-border-light)] text-[var(--gov-text-muted)]">
                  <th className="pb-2 pr-4 font-semibold">Component</th>
                  <th className="pb-2 font-semibold">In Dharohar</th>
                </tr>
              </thead>
              <tbody>
                {SUGGESTED_TECH_STACK.map((row) => (
                  <tr key={row.component} className="border-b border-[var(--gov-border-light)] last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-[var(--gov-navy)]">{row.component}</td>
                    <td className="py-2.5 text-[var(--gov-text-muted)]">{row.technology}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Integration modules">
          {!health ? (
            <LoadingState message="Checking module health..." />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--gov-text-muted)]">
                REST integration layer for LRMS-adjacent services{" "}
                {health.mock_mode ? "(mock mode enabled)" : "(live adapters)"}.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(health.modules).map(([name, m]) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-md border border-[var(--gov-border-light)] px-3 py-2"
                  >
                    <Cpu className="h-4 w-4 text-[var(--gov-navy-light)]" />
                    <span className="text-sm font-medium text-[var(--gov-navy)]">{name.replace(/_/g, " ")}</span>
                    <span
                      className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        m.status === "connected" || m.status === "local"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-[var(--gov-text-light)] mt-4">
            Detailed mapping:{" "}
            <code className="text-[11px] bg-[var(--gov-bg-subtle)] px-1 rounded">docs/STUDY_ALIGNMENT.md</code>
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}

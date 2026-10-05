"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { WorkflowPipeline } from "@/components/dashboard/WorkflowPipeline";
import { FIELD_LABELS } from "@/lib/config";
import { STUDY_TITLE, STUDY_TAGLINE, STUDY_PILLARS, EXTRACTED_FIELD_GROUPS, STAKEHOLDERS, SUGGESTED_TECH_STACK } from "@/lib/study-spec";
import { BookOpen, ExternalLink } from "lucide-react";
import { RequirementCoverageGrid, DemoWalkthrough } from "@/components/study/RequirementCoverage";
import { solutionRequirementStats } from "@/lib/solution-requirements";
import { useLocale } from "@/contexts/LocaleContext";

export function SolutionOverview() {
  const { t } = useLocale();
  const stats = solutionRequirementStats();

  return (
    <AppLayout title="About the system">
      <div className="space-y-6 max-w-5xl">
        <DashboardHero
          eyebrow="Land record modernization"
          title={STUDY_TITLE}
          description={STUDY_TAGLINE}
          icon={BookOpen}
          accent="navy"
          actions={[{ href: "https://dilrmp.gov.in/", label: "DILRMP context", icon: ExternalLink, variant: "outline" }]}
        />

        <WorkflowPipeline />

        <Card title="Platform capabilities">
          <p className="text-sm text-[var(--gov-text-muted)] mb-4">
            {t("{a} capabilities active, {b} depending on deployment configuration.", { a: stats.implemented, b: stats.partial })}
          </p>
          <RequirementCoverageGrid />
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Who does what">
            <DemoWalkthrough />
          </Card>
          <Card title="Platform pillars">
            <ul className="space-y-4">
              {STUDY_PILLARS.map((p) => (
                <li key={p.title}>
                  <p className="text-sm font-semibold text-[var(--gov-navy)]">{t(p.title)}</p>
                  <p className="text-xs text-[var(--gov-text-muted)] mt-1 leading-relaxed">{t(p.description)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Predefined extraction fields">
            <div className="space-y-4">
              {EXTRACTED_FIELD_GROUPS.map((g) => (
                <div key={g.group}>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--gov-text-muted)]">{t(g.group)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {g.fields.map((key) => (
                      <span key={key} className="text-xs rounded-md border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] px-2 py-1 text-[var(--gov-navy)]">
                        {t(FIELD_LABELS[key] ?? key)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Stakeholders served">
            <ul className="list-disc list-inside text-sm text-[var(--gov-text-muted)] space-y-1">
              {STAKEHOLDERS.map((s) => (
                <li key={s}>{t(s)}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Component-wise technology">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--gov-border-light)] text-[var(--gov-text-muted)]">
                  <th className="pb-2 pr-4 font-semibold">{t("Component")}</th>
                  <th className="pb-2 font-semibold">{t("In Dharohar")}</th>
                </tr>
              </thead>
              <tbody>
                {SUGGESTED_TECH_STACK.map((row) => (
                  <tr key={row.component} className="border-b border-[var(--gov-border-light)] last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-[var(--gov-navy)] align-top">{t(row.component)}</td>
                    <td className="py-2.5 text-[var(--gov-text-muted)]">{t(row.technology)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Integration">
          <p className="text-sm text-[var(--gov-text-muted)]">
            {t("External systems read verified records, parcels and certificates through the versioned API at /api/v1. Administrators manage API keys, webhooks and live subsystem health under Integrations.")}{" "}
            <a className="text-[var(--gov-navy-light)] font-semibold" href="/api/v1/openapi.json">
              {t("API documentation")} (OpenAPI)
            </a>
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}

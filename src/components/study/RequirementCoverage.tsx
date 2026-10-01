"use client";

import Link from "next/link";
import {
  SOLUTION_REQUIREMENTS,
  DEMO_WALKTHROUGH_STEPS,
  solutionRequirementStats,
  type RequirementStatus,
} from "@/lib/solution-requirements";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, AlertCircle, ChevronRight } from "lucide-react";

const STATUS_META: Record<
  RequirementStatus,
  { label: string; icon: typeof CheckCircle2; className: string; dot: string }
> = {
  implemented: {
    label: "Active",
    icon: CheckCircle2,
    className: "border-green-200 bg-green-50/80",
    dot: "bg-[var(--gov-green)]",
  },
  partial: {
    label: "Partial integration",
    icon: AlertCircle,
    className: "border-amber-200 bg-amber-50/60",
    dot: "bg-[var(--gov-saffron)]",
  },
  roadmap: {
    label: "Roadmap",
    icon: CircleDashed,
    className: "border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)]",
    dot: "bg-[var(--gov-text-light)]",
  },
};

export function RequirementCoverageSummary({ compact }: { compact?: boolean }) {
  const stats = solutionRequirementStats();
  const pct = Math.round(((stats.implemented + stats.partial * 0.5) / stats.total) * 100);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-bold text-[var(--gov-navy)]">Solution coverage ~{pct}%</span>
        <span className="text-[var(--gov-green)] font-semibold">{stats.implemented} live</span>
        <span className="text-amber-700 font-semibold">{stats.partial} partial</span>
        <span className="text-[var(--gov-text-muted)]">{stats.roadmap} roadmap</span>
      </div>
    );
  }

  return (
    <div className="gov-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gov-text-muted)]">
            Solution requirements
          </p>
          <p className="text-lg font-bold text-[var(--gov-navy)] mt-1">
            {stats.implemented} active · {stats.partial} partial · {stats.roadmap} planned
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="relative h-14 w-14 rounded-full flex items-center justify-center bg-[var(--gov-navy)] text-white font-bold text-sm"
            aria-label={`Approximate coverage ${pct} percent`}
          >
            {pct}%
          </div>
          <Link
            href="/about"
            className="text-sm font-semibold text-[var(--gov-navy-light)] hover:underline inline-flex items-center gap-1"
          >
            Full scope <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <RequirementCoverageGrid />
    </div>
  );
}

export function RequirementCoverageGrid() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {SOLUTION_REQUIREMENTS.map((req) => {
        const meta = STATUS_META[req.status];
        const Icon = meta.icon;
        return (
          <div
            key={req.id}
            className={cn("rounded-lg border p-3 transition-shadow hover:shadow-sm", meta.className)}
          >
            <div className="flex gap-2">
              <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 text-[var(--gov-navy)]" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", meta.dot)} />
                  <p className="text-sm font-semibold text-[var(--gov-navy)] leading-snug">{req.label}</p>
                </div>
                <p className="text-[11px] text-[var(--gov-text-muted)] mt-1 leading-relaxed">{req.summary}</p>
                {req.demoHint && (
                  <p className="text-[10px] font-medium text-[var(--gov-navy-light)] mt-2">
                    In application: {req.demoHint}
                  </p>
                )}
                <p className="text-[10px] uppercase tracking-wider text-[var(--gov-text-light)] mt-1">{meta.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DemoWalkthrough() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gov-text-muted)]">
        Standard processing sequence
      </p>
      <ol className="space-y-2">
        {DEMO_WALKTHROUGH_STEPS.map((s) => (
          <li key={s.step} className="flex gap-3 rounded-lg border border-[var(--gov-border-light)] bg-white p-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gov-navy)] text-xs font-bold text-white">
              {s.step}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--gov-navy)]">{s.role}</p>
              <p className="text-xs text-[var(--gov-text-muted)] mt-0.5">{s.action}</p>
              <p className="text-[10px] text-[var(--gov-text-light)] mt-1 font-mono">{s.email}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

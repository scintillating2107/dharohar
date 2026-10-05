"use client";

import type { LandRecord } from "@/types";
import { formatConfidence, getConfidenceLevel, getFieldLabel, cn } from "@/lib/utils";
import { FieldSourceBadge } from "@/components/ui/StatusBadges";
import { FIELD_SECTIONS } from "@/lib/config";
import { useSystemSettings } from "@/lib/use-api";
import { useLocale } from "@/contexts/LocaleContext";
import { AlertTriangle } from "lucide-react";

/** Every extracted field with its value, confidence and provenance, grouped by section. */
export function LandRecordTable({ record }: { record: LandRecord }) {
  const settings = useSystemSettings();
  const { t } = useLocale();
  const threshold = settings?.reviewThreshold;

  return (
    <div className="gov-card overflow-hidden">
      <div className="gov-card-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--gov-text-muted)]">{record.record_id} · {t("Version {n}", { n: record.version ?? 1 })}</p>
          <h3 className="text-lg font-bold text-[var(--gov-navy)]">{t("Extracted fields")}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">{t("Average confidence")}</p>
          <p className="text-xl font-bold text-[var(--gov-navy)]">{formatConfidence(record.averageConfidence)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--gov-bg-subtle)] text-left text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">
              <th className="px-4 py-3 font-semibold">{t("Field")}</th>
              <th className="px-4 py-3 font-semibold">{t("Value")}</th>
              <th className="px-4 py-3 font-semibold">{t("Confidence")}</th>
              <th className="px-4 py-3 font-semibold">{t("Source")}</th>
            </tr>
          </thead>
          {Object.entries(FIELD_SECTIONS).map(([section, keys]) => (
            <tbody key={section}>
              <tr>
                <td colSpan={4} className="px-4 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-[var(--gov-navy)]">{t(section)}</td>
              </tr>
              {keys.map((key) => {
                const f = record.fields[key];
                const low = f && getConfidenceLevel(f.confidence, threshold) === "low";
                return (
                  <tr key={key} className={cn("border-t border-[var(--gov-border-light)]", low && "bg-amber-50/70")}>
                    <td className="px-4 py-2.5 text-[var(--gov-text-muted)]">{t(getFieldLabel(key))}</td>
                    <td className="px-4 py-2.5 font-medium text-[var(--gov-navy)]">
                      {f ? (
                        <>
                          {key === "land_type" || key === "village" || key === "tehsil" || key === "district" || key === "state" ? t(f.value) : f.value}
                          {f.unit && <span className="text-[var(--gov-text-muted)] ml-1">{t(f.unit)}</span>}
                          {f.aiValue !== undefined && f.aiValue !== f.value && (
                            <span className="block text-xs font-normal text-[var(--gov-text-muted)]">{t("AI read: “{value}”", { value: f.aiValue })}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--gov-text-light)]">{t("Not found")}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {f ? (
                        <span className="inline-flex items-center gap-1">
                          {formatConfidence(f.confidence)}
                          {low && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">{f && <FieldSourceBadge source={f.source} />}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      {record.owners && record.owners.length > 0 && (
        <div className="border-t border-[var(--gov-border-light)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--gov-navy)] mb-2">{t("Owners")}</p>
          <ul className="text-sm space-y-1">
            {record.owners.map((o, i) => (
              <li key={i}>
                <strong>{o.name}</strong>
                {o.relation_name && <span className="text-[var(--gov-text-muted)]"> {t(o.relation_type ?? "S/O")} {o.relation_name}</span>}
                {o.share !== undefined && <span className="text-[var(--gov-text-muted)]"> · {t("Share")} {o.share}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

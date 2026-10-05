"use client";

import type { ValidationResult } from "@/types";
import { Card } from "@/components/ui/Card";
import { ValidationStatusBadge } from "@/components/ui/StatusBadges";
import { Check, AlertTriangle, XCircle } from "lucide-react";
import { getFieldLabel } from "@/lib/utils";
import { ISSUE_LABELS } from "@/lib/config";
import { useLocale } from "@/contexts/LocaleContext";

export function ValidationSummary({ validation }: { validation: ValidationResult }) {
  const { t, tx } = useLocale();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-slate-900">{validation.validation_score}</p>
          <p className="text-xs text-slate-500 mt-1">{t("Validation score")}</p>
        </div>
        <ValidationStatusBadge status={validation.validation_status} />
      </div>

      {validation.passed_checks && validation.passed_checks.length > 0 && (
        <Card title="Passed checks">
          <ul className="space-y-2">
            {validation.passed_checks.map((check, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4 flex-shrink-0" />
                {tx(check)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {validation.warnings.length > 0 && (
        <Card title="Warnings">
          <div className="space-y-4">
            {validation.warnings.map((w, i) => (
              <div key={i} className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {t(getFieldLabel(w.field))}: {tx(w.message)}
                    </p>
                    {w.current_value && w.previous_value && (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">{t("Current")}:</span>
                          <p className="font-medium">{tx(w.current_value)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">{t("Previous")}:</span>
                          <p className="font-medium">{tx(w.previous_value)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">{t("Type")}:</span>
                          <p className="font-medium">{t(ISSUE_LABELS[w.type] ?? w.type.replace(/_/g, " ").toLowerCase())}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {validation.errors.length > 0 && (
        <Card title="Errors">
          <div className="space-y-3">
            {validation.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t(getFieldLabel(e.field))}: {tx(e.message)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {validation.duplicate.detected && (
        <Card title="Possible duplicate">
          <p className="text-sm text-amber-700">
            {t("Similar record detected with {n}% similarity", { n: Math.round(validation.duplicate.similarity * 100) })}
            {validation.duplicate.record_id && ` (${validation.duplicate.record_id})`}
          </p>
        </Card>
      )}
    </div>
  );
}

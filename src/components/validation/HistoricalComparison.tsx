import { Card } from "@/components/ui/Card";
import { getFieldLabel } from "@/lib/utils";
import type { ValidationWarning } from "@/types";
import { AlertTriangle } from "lucide-react";

export function HistoricalComparison({
  warnings,
}: {
  warnings: ValidationWarning[];
}) {
  const historical = warnings.filter((w) => w.type === "HISTORICAL_MISMATCH");

  if (historical.length === 0) {
    return (
      <Card title="Historical Comparison">
        <p className="text-sm text-slate-500">No historical discrepancies detected.</p>
      </Card>
    );
  }

  return (
    <Card title="Historical Comparison">
      <div className="space-y-4">
        {historical.map((w, i) => (
          <div key={i} className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  {getFieldLabel(w.field)}: {w.message}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Current</p>
                    <p className="font-medium text-slate-800 mt-1">{w.current_value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Previous</p>
                    <p className="font-medium text-slate-800 mt-1">{w.previous_value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Difference</p>
                    <p className="font-medium text-amber-700 mt-1">
                      {w.current_value && w.previous_value ? "See values above" : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

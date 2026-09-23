import { Card } from "@/components/ui/Card";
import { ConfidenceBadge } from "@/components/ui/StatusBadges";
import { getFieldLabel, getConfidenceLevel } from "@/lib/utils";
import type { ExtractedFieldValue } from "@/types";
import { AlertTriangle } from "lucide-react";

export function LowConfidenceSummary({
  fields,
}: {
  fields: Record<string, ExtractedFieldValue>;
}) {
  const lowFields = Object.entries(fields).filter(
    ([, f]) => getConfidenceLevel(f.confidence) === "low"
  );

  if (lowFields.length === 0) return null;

  return (
    <Card title="Fields Requiring Review">
      <div className="flex items-center gap-2 mb-3 text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        <p className="text-sm font-medium">
          {lowFields.length} field{lowFields.length > 1 ? "s" : ""} below confidence threshold
        </p>
      </div>
      <div className="space-y-2">
        {lowFields.map(([key, field]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
          >
            <div>
              <p className="text-xs text-slate-500">{getFieldLabel(key)}</p>
              <p className="text-sm font-medium text-slate-800">
                {field.value}
                {field.unit && <span className="text-slate-500 ml-1">{field.unit}</span>}
              </p>
            </div>
            <ConfidenceBadge confidence={field.confidence} />
          </div>
        ))}
      </div>
    </Card>
  );
}

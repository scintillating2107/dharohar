"use client";

import { cn, getConfidenceLevel, getFieldLabel } from "@/lib/utils";
import type { ExtractedFieldValue } from "@/types";
import { ConfidenceBadge } from "@/components/ui/StatusBadges";
import { Input } from "@/components/ui/Input";
import { AlertTriangle } from "lucide-react";

interface ExtractedFieldProps {
  fieldKey: string;
  field: ExtractedFieldValue;
  editable?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  highlighted?: boolean;
}

export function ExtractedField({
  fieldKey,
  field,
  editable,
  value,
  onChange,
  onFocus,
  highlighted,
}: ExtractedFieldProps) {
  const level = getConfidenceLevel(field.confidence);
  const displayValue = value ?? field.value;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        level === "low" && "border-amber-300 bg-amber-50/50",
        level === "medium" && "border-slate-200 bg-white",
        level === "high" && "border-slate-200 bg-white",
        highlighted && "ring-2 ring-amber-400"
      )}
      onFocus={onFocus}
    >
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getFieldLabel(fieldKey)}
        </label>
        <ConfidenceBadge confidence={field.confidence} />
      </div>
      {editable ? (
        <Input
          value={displayValue}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={onFocus}
          className={cn(level === "low" && "border-amber-400")}
        />
      ) : (
        <p className="text-sm font-medium text-slate-900">
          {displayValue}
          {field.unit && <span className="text-slate-500 ml-1">{field.unit}</span>}
        </p>
      )}
      {level === "low" && (
        <div className="flex items-center gap-1 mt-2 text-xs text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          Low confidence — review recommended
        </div>
      )}
    </div>
  );
}

export function FieldCard({
  title,
  fields,
  recordFields,
  editable,
  editedValues,
  onFieldChange,
  onFieldFocus,
  highlightedField,
}: {
  title: string;
  fields: string[];
  recordFields: Record<string, ExtractedFieldValue>;
  editable?: boolean;
  editedValues?: Record<string, string>;
  onFieldChange?: (key: string, value: string) => void;
  onFieldFocus?: (key: string) => void;
  highlightedField?: string;
}) {
  const visibleFields = fields.filter((f) => recordFields[f]);

  if (visibleFields.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleFields.map((key) => (
          <ExtractedField
            key={key}
            fieldKey={key}
            field={recordFields[key]}
            editable={editable}
            value={editedValues?.[key]}
            onChange={(v) => onFieldChange?.(key, v)}
            onFocus={() => onFieldFocus?.(key)}
            highlighted={highlightedField === key}
          />
        ))}
      </div>
    </div>
  );
}

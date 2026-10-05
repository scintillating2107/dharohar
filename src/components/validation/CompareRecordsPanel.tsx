"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { FIELD_SECTIONS } from "@/lib/config";
import { cn, getFieldLabel } from "@/lib/utils";
import type { LandRecord, RecordVersion } from "@/types";
import { AlertTriangle, Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface Detail {
  record: LandRecord;
  versions: RecordVersion[];
}

type Side = { label: string; fields: LandRecord["fields"] };

function norm(v: string | undefined) {
  return (v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Field-by-field comparison of a record against one of its own earlier versions or another
 * record (e.g. the historical / duplicate record flagged by validation).
 */
export function CompareRecordsPanel({ recordId }: { recordId: string }) {
  const { t, tx } = useLocale();
  const { data, initialLoading } = useApi<Detail>(`/api/records/${recordId}`);
  const related = useMemo(() => {
    const ids = new Set<string>();
    for (const w of data?.record.validation?.warnings ?? []) if (w.related_record_id?.startsWith("LR-")) ids.add(w.related_record_id);
    if (data?.record.validation?.duplicate.record_id) ids.add(data.record.validation.duplicate.record_id);
    return [...ids];
  }, [data]);
  const [target, setTarget] = useState<string>("");
  const [otherId, setOtherId] = useState("");
  const effective = target || (related[0] ? `record:${related[0]}` : data?.versions.length ? `version:${data.versions[0].version}` : "");
  const otherRecordId = effective.startsWith("record:") ? effective.slice(7) : null;
  const other = useApi<Detail>(otherRecordId ? `/api/records/${otherRecordId}` : null);

  if (initialLoading) return <LoadingState />;
  if (!data) return <p className="text-sm text-red-700">{t("Record not found.")}</p>;

  const current: Side = { label: `${data.record.record_id} (${t("current v{n}", { n: data.record.version ?? 1 })})`, fields: data.record.fields };
  let compare: Side | null = null;
  if (effective.startsWith("version:")) {
    const v = data.versions.find((x) => String(x.version) === effective.slice(8));
    if (v?.snapshot.fields) compare = { label: `${t("Version {n}", { n: v.version })} — ${tx(v.reason)}`, fields: v.snapshot.fields };
  } else if (other.data) {
    compare = { label: `${other.data.record.record_id} (${t(other.data.record.status.charAt(0) + other.data.record.status.slice(1).toLowerCase().replace(/_/g, " "))})`, fields: other.data.record.fields };
  }

  const keys = Object.values(FIELD_SECTIONS).flat();
  const diffs = compare ? keys.filter((k) => norm(current.fields[k]?.value) !== norm(compare!.fields[k]?.value)).length : 0;

  return (
    <div className="space-y-4">
      <Card title="Compare with">
        <div className="flex flex-wrap gap-2 items-center">
          <Select className="max-w-md" value={effective} onChange={(e) => setTarget(e.target.value)}>
            <option value="">{t("Choose…")}</option>
            {related.length > 0 && (
              <optgroup label={t("Related records (from validation)")}>
                {related.map((r) => <option key={r} value={`record:${r}`}>{r}</option>)}
              </optgroup>
            )}
            {data.versions.length > 0 && (
              <optgroup label={t("Earlier versions of this record")}>
                {data.versions.map((v) => <option key={v.id} value={`version:${v.version}`}>v{v.version} — {tx(v.reason)}</option>)}
              </optgroup>
            )}
            {otherRecordId && !related.includes(otherRecordId) && <option value={`record:${otherRecordId}`}>{otherRecordId}</option>}
          </Select>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (otherId.trim()) setTarget(`record:${otherId.trim()}`);
            }}
          >
            <Input className="max-w-[200px]" placeholder={t("Other record ID")} value={otherId} onChange={(e) => setOtherId(e.target.value)} />
            <Button type="submit" variant="outline" size="sm">{t("Compare")}</Button>
          </form>
        </div>
      </Card>

      {compare ? (
        <Card title={t("{n} difference(s)", { n: diffs })}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--gov-text-muted)]">
                  <th className="py-2 pr-3">{t("Field")}</th>
                  <th className="py-2 pr-3">{compare.label}</th>
                  <th className="py-2 pr-3">{current.label}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const a = compare!.fields[k];
                  const b = current.fields[k];
                  if (!a && !b) return null;
                  const same = norm(a?.value) === norm(b?.value) && norm(a?.unit) === norm(b?.unit);
                  return (
                    <tr key={k} className={cn("border-t border-[var(--gov-border-light)]", !same && "bg-amber-50/70")}>
                      <td className="py-2 pr-3 text-[var(--gov-text-muted)]">{t(getFieldLabel(k))}</td>
                      <td className="py-2 pr-3">{a ? `${a.value}${a.unit ? ` ${t(a.unit)}` : ""}` : "—"}</td>
                      <td className="py-2 pr-3 font-medium">{b ? `${b.value}${b.unit ? ` ${t(b.unit)}` : ""}` : "—"}</td>
                      <td className="py-2">{same ? <Check className="h-4 w-4 text-[var(--gov-green)]" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : otherRecordId && other.initialLoading ? (
        <LoadingState />
      ) : otherRecordId && other.error ? (
        <p className="text-sm text-red-700">{tx(other.error)}</p>
      ) : (
        <p className="text-sm text-[var(--gov-text-muted)]">{t("Choose a version or record to compare.")}</p>
      )}
    </div>
  );
}

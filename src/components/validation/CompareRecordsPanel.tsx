"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Info } from "lucide-react";
import type { LandRecord } from "@/types";

type RowResult = "match" | "warn" | "info";

interface CompareRow {
  field: string;
  older: string;
  newer: string;
  result: RowResult;
}

const DEMO_ROWS: CompareRow[] = [
  { field: "Owner", older: "Ram Singh", newer: "Ram Singh", result: "match" },
  { field: "Khasra", older: "235/1", newer: "235/1", result: "match" },
  { field: "Area", older: "2.40 ha", newer: "1.80 ha", result: "warn" },
  { field: "Mutation", older: "—", newer: "M-2024-123", result: "info" },
  { field: "Classification", older: "Agricultural", newer: "Agricultural", result: "match" },
];

function ResultIcon({ result }: { result: RowResult }) {
  if (result === "match") return <Check className="h-4 w-4 text-[var(--gov-green)]" />;
  if (result === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <Info className="h-4 w-4 text-[var(--gov-navy-light)]" />;
}

function rowsFromRecord(record: LandRecord): CompareRow[] {
  const warnings = record.validation?.warnings ?? [];
  const areaWarn = warnings.find((w) => w.type === "HISTORICAL_MISMATCH" || w.field === "area");
  const mutation = record.fields.mutation_number?.value;

  const olderArea = areaWarn?.previous_value ?? "2.40 ha";
  const newerArea = areaWarn?.current_value ?? `${record.fields.area?.value ?? "—"} ${record.fields.area?.unit ?? "ha"}`.trim();

  return [
    {
      field: "Owner",
      older: record.owner_name,
      newer: record.owner_name,
      result: "match",
    },
    {
      field: "Khasra",
      older: record.khasra_number,
      newer: record.khasra_number,
      result: "match",
    },
    {
      field: "Area",
      older: olderArea,
      newer: newerArea,
      result: areaWarn ? "warn" : "match",
    },
    {
      field: "Mutation",
      older: "—",
      newer: mutation || "—",
      result: mutation ? "info" : "match",
    },
    {
      field: "Classification",
      older: record.fields.land_type?.value ?? "—",
      newer: record.fields.land_type?.value ?? "—",
      result: "match",
    },
  ];
}

function areaChangeBanner(rows: CompareRow[], newerYear: string, olderYear: string) {
  const area = rows.find((r) => r.field === "Area");
  if (!area || area.result !== "warn") return null;

  const parseHa = (s: string) => {
    const m = s.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : NaN;
  };
  const oldHa = parseHa(area.older);
  const newHa = parseHa(area.newer);
  if (Number.isNaN(oldHa) || Number.isNaN(newHa)) {
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-5">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-900">Change detected</p>
        <p className="text-lg font-semibold text-amber-950 mt-1">Area differs from historical record</p>
        <p className="text-sm text-amber-800 mt-2">
          Compare against mutation {newerYear} register and prior khatauni ({olderYear}) before approval.
        </p>
      </div>
    );
  }
  const diff = Math.abs(oldHa - newHa);
  const direction = newHa < oldHa ? "decreased" : "increased";

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-5">
      <p className="text-sm font-bold uppercase tracking-wide text-amber-900">Change detected</p>
      <p className="text-lg font-semibold text-amber-950 mt-1">
        Area {direction} by {diff.toFixed(2)} ha
      </p>
      <p className="text-sm text-amber-800 mt-2">
        Compare against mutation {newerYear} register entry and prior khatauni ({olderYear}) before approval.
      </p>
    </div>
  );
}

export function CompareRecordsPanel({ record }: { record?: LandRecord }) {
  const [olderYear, setOlderYear] = useState(record?.record_year ? String(record.record_year - 28) : "1998");
  const [newerYear, setNewerYear] = useState(
    record?.record_year ? String(record.record_year) : "2026"
  );

  const rows = useMemo(() => (record ? rowsFromRecord(record) : DEMO_ROWS), [record]);
  const banner = areaChangeBanner(rows, newerYear, olderYear);

  return (
    <div className="space-y-6">
      <Card title="Compare land records">
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <label className="text-sm">
            <span className="text-xs font-semibold uppercase text-[var(--gov-text-muted)]">Older record</span>
            <select
              value={olderYear}
              onChange={(e) => setOlderYear(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm"
            >
              {["1998", "2004", "2012"].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs font-semibold uppercase text-[var(--gov-text-muted)]">Newer record</span>
            <select
              value={newerYear}
              onChange={(e) => setNewerYear(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm"
            >
              {["2024", "2025", "2026"].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--gov-text-muted)] border-b border-[var(--gov-border-light)]">
                <th className="py-2 pr-4">Field</th>
                <th className="py-2 pr-4">{olderYear}</th>
                <th className="py-2 pr-4">{newerYear}</th>
                <th className="py-2 w-16">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.field} className="border-b border-[var(--gov-border-light)] last:border-0">
                  <td className="py-3 font-medium text-[var(--gov-navy)]">{row.field}</td>
                  <td className="py-3 text-[var(--gov-text-muted)]">{row.older}</td>
                  <td className={cn("py-3", row.result === "warn" && "font-semibold text-amber-800")}>{row.newer}</td>
                  <td className="py-3"><ResultIcon result={row.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {banner}
    </div>
  );
}

"use client";

import { useState } from "react";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { useLocale } from "@/contexts/LocaleContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { apiPut } from "@/lib/api-client";
import { useToast } from "@/contexts/ToastContext";
import type { SystemSettings } from "@/types";

interface MasterData {
  counts: { level: string; n: number }[];
  rows: { id: number; level: string; state: string; district: string; tehsil: string | null; village: string | null; nameHi: string | null; lat: number | null; lng: number | null }[];
}

function SettingsForm({ initial }: { initial: SystemSettings }) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const pct = (v: number) => Math.round(v * 100);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiPut<{ settings: SystemSettings }>("/api/admin/settings", s);
      setS(res.settings);
      toast("Settings saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  const pctInput = (key: "reviewThreshold" | "highPriorityThreshold" | "autoApproveThreshold") => (
    <Input type="number" min={0} max={100} value={pct(s[key])} onChange={(e) => setS({ ...s, [key]: Number(e.target.value) / 100 })} />
  );

  return (
    <Card title="Review & approval rules">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Review threshold (%)" hint="Fields below this confidence are flagged for officer review">{pctInput("reviewThreshold")}</Field>
        <Field label="High-priority threshold (%)" hint="Records averaging below this go to the top of the queue">{pctInput("highPriorityThreshold")}</Field>
        <Field label="Parcel area tolerance (%)" hint="Allowed difference between surveyed and recorded area">
          <Input type="number" min={0} max={100} value={s.areaTolerancePct} onChange={(e) => setS({ ...s, areaTolerancePct: Number(e.target.value) })} />
        </Field>
        <Field label="Auto-approve threshold (%)" hint="Only applies when auto-approval is enabled">{pctInput("autoApproveThreshold")}</Field>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={s.autoApproveEnabled} onChange={(e) => setS({ ...s, autoApproveEnabled: e.target.checked })} />
          <span>
            <strong>{t("Auto-approve")}</strong>: {t("approve records that pass every validation check with average confidence at or above the threshold.")}
            <span className="block text-xs text-[var(--gov-text-muted)]">{t("Approvals are signed by “System” and audited. Leave off unless accuracy has been measured.")}</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={s.makerChecker} onChange={(e) => setS({ ...s, makerChecker: e.target.checked })} />
          <span>
            <strong>{t("Maker-checker")}</strong>: {t("an officer who edits a record cannot approve it.")}
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={s.learningEnabled} onChange={(e) => setS({ ...s, learningEnabled: e.target.checked })} />
          <span>
            <strong>{t("Learn from corrections")}</strong>: {t("use officer corrections as examples and apply repeated corrections automatically.")}
          </span>
        </label>
      </div>
      <Button className="mt-4" onClick={save} loading={saving}>{t("Save settings")}</Button>
    </Card>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const { t } = useLocale();
  const settings = useApi<{ settings: SystemSettings }>("/api/admin/settings");
  const [district, setDistrict] = useState("");
  const [filter, setFilter] = useState("");
  const master = useApi<MasterData>(`/api/admin/master-data${filter ? `?district=${encodeURIComponent(filter)}` : ""}`);
  const [uploading, setUploading] = useState(false);

  const importCsv = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/master-data", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Import failed");
      toast(t("Imported {n} rows", { n: json.data.imported }), "success");
      master.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout title="System settings">
      <div className="space-y-6 max-w-4xl">
        <PageTitle title="System settings" description="Review thresholds, approval rules and the master location data used for validation." />
        {settings.data ? <SettingsForm initial={settings.data.settings} /> : <LoadingState />}

        <Card title="Master location data (LGD)">
          <p className="text-sm text-[var(--gov-text-muted)]">
            {t("Used to validate state / district / tehsil / village names (in English or Hindi), canonicalise spellings, and place records on the map when no surveyed boundary exists.")}
          </p>
          <div className="flex flex-wrap gap-2 my-3">
            {master.data?.counts.map((c) => (
              <span key={c.level} className="rounded-full bg-[var(--gov-bg-subtle)] border border-[var(--gov-border-light)] px-3 py-1 text-xs">
                {c.n} {t(({ state: "states", district: "districts", tehsil: "tehsils", village: "villages" } as Record<string, string>)[c.level] ?? c.level)}
              </span>
            ))}
          </div>
          <div className="rounded-md border border-dashed border-[var(--gov-border)] p-4 text-sm space-y-2">
            <p className="font-medium text-[var(--gov-navy)]">{t("Import CSV")}</p>
            <p className="text-xs text-[var(--gov-text-muted)]">
              {t("Columns")}: <code className="break-all">level,state,district,tehsil,village,name_hi,lgd_code,lat,lng</code> (level = state | district | tehsil | village).{" "}
              {t("Download village lists from the Local Government Directory (lgdirectory.gov.in).")}
            </p>
            <input type="file" aria-label={t("Import CSV")} className="max-w-full text-xs" accept=".csv,text/csv" disabled={uploading} onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          </div>
          <form
            className="flex flex-wrap gap-2 mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter(district.trim());
            }}
          >
            <Input className="max-w-xs" placeholder={t("Show entries for district…")} value={district} onChange={(e) => setDistrict(e.target.value)} />
            <Button type="submit" variant="outline" size="sm">{t("Show")}</Button>
          </form>
          {master.data && (
            <div className="overflow-x-auto mt-3 max-h-80">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--gov-text-muted)] uppercase">
                    <th className="py-1 pr-2">{t("Level")}</th><th className="pr-2">{t("State")}</th><th className="pr-2">{t("District")}</th><th className="pr-2">{t("Tehsil")}</th><th className="pr-2">{t("Village")}</th><th className="pr-2">{t("Hindi")}</th><th>{t("Lat, Lng")}</th>
                  </tr>
                </thead>
                <tbody>
                  {master.data.rows.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--gov-border-light)]">
                      <td className="py-1">{t(r.level.charAt(0).toUpperCase() + r.level.slice(1))}</td><td>{r.state}</td><td>{r.district}</td><td>{r.tehsil ?? ""}</td><td>{r.village ?? ""}</td><td>{r.nameHi ?? ""}</td>
                      <td>{r.lat != null ? `${r.lat}, ${r.lng}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

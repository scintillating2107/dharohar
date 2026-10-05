"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout, PageTitle } from "@/components/layout/AppLayout";
import { MapView } from "@/components/gis/MapView";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RecordStatusBadge } from "@/components/ui/StatusBadges";
import { LoadingState } from "@/components/ui/States";
import { useApi } from "@/lib/use-api";
import { apiPut } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";
import { hasPermission } from "@/lib/config";
import { formatArea } from "@/lib/utils";
import type { Parcel } from "@/types";
import { Upload, PenLine, Search } from "lucide-react";

interface AreaCheck {
  polygonAreaHa: number;
  recordAreaHa: number | null;
  differencePct: number | null;
  withinTolerance: boolean | null;
}

function GISContent() {
  const params = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, tx } = useLocale();
  const canEdit = user ? hasPermission(user.role, "gis_edit") : false;
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [query, setQuery] = useState(params.get("search") ?? "");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [geometry, setGeometry] = useState(params.get("geometry") ?? "");
  const [satellite, setSatellite] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawn, setDrawn] = useState<GeoJSON.Polygon | null>(null);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<AreaCheck | null>(null);

  const qs = new URLSearchParams();
  if (query) qs.set("search", query);
  if (district) qs.set("district", district);
  if (status) qs.set("status", status);
  if (geometry) qs.set("geometry", geometry);
  const { data, initialLoading, reload } = useApi<{ parcels: Parcel[] }>(`/api/gis?${qs}`);
  const districts = useApi<{ districts: string[] }>("/api/meta/locations").data?.districts ?? [];
  const parcels = data?.parcels ?? [];
  const recordParam = params.get("record");
  const selected =
    parcels.find((p) => p.parcel_id === selectedId) ?? (!selectedId && recordParam ? parcels.find((p) => p.record_id === recordParam) : undefined) ?? null;

  const onDrawn = useCallback((g: GeoJSON.Polygon) => setDrawn(g), []);

  const saveGeometry = async (body: FormData | { geometry: GeoJSON.Polygon }) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res =
        body instanceof FormData
          ? await fetch(`/api/gis/${selected.record_id}`, { method: "PUT", body, credentials: "include" }).then(async (r) => {
              const json = await r.json();
              if (!r.ok || !json.success) throw new Error(json.error || "Upload failed");
              return json.data as { check: AreaCheck };
            })
          : await apiPut<{ check: AreaCheck }>(`/api/gis/${selected.record_id}`, body);
      setCheck(res.check);
      setDrawn(null);
      setDrawMode(false);
      toast(
        res.check.withinTolerance === false ? "Boundary saved — area differs from the record beyond tolerance" : "Surveyed boundary saved",
        res.check.withinTolerance === false ? "warning" : "success"
      );
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save boundary", "error");
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    surveyed: parcels.filter((p) => p.geometry_source === "surveyed").length,
    approximate: parcels.filter((p) => p.geometry_source === "approximate").length,
    none: parcels.filter((p) => p.geometry_source === "none").length,
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title="Land parcels"
        description={t("{surveyed} surveyed boundaries · {approximate} approximate locations · {none} without location", counts)}
      />

      <form
        className="grid grid-cols-2 md:flex md:flex-wrap gap-2 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <Input className="col-span-2 md:max-w-xs" placeholder={t("Khasra, owner, village or record ID")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("Search parcels")} />
        <Select className="md:max-w-[180px]" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label={t("District")}>
          <option value="">{t("All districts")}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{t(d)}</option>
          ))}
        </Select>
        <Select className="md:max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("Status")}>
          <option value="">{t("All statuses")}</option>
          <option value="VERIFIED">{t("Verified")}</option>
          <option value="VERIFICATION_REQUIRED">{t("Under review")}</option>
        </Select>
        <Select className="md:max-w-[200px]" value={geometry} onChange={(e) => setGeometry(e.target.value)} aria-label={t("Geometry")}>
          <option value="">{t("Any geometry")}</option>
          <option value="surveyed">{t("Surveyed boundary")}</option>
          <option value="approximate">{t("Approximate location")}</option>
          <option value="none">{t("No location")}</option>
        </Select>
        <Button type="submit" variant="outline" size="sm">
          <Search className="h-4 w-4" /> {t("Search")}
        </Button>
        <Button type="button" variant={satellite ? "primary" : "outline"} size="sm" onClick={() => setSatellite(!satellite)} aria-pressed={satellite}>
          {satellite ? t("Satellite") : t("Street map")}
        </Button>
      </form>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {initialLoading ? (
            <LoadingState message="Loading parcels…" />
          ) : (
            <MapView
              parcels={parcels}
              selectedId={selected?.parcel_id ?? null}
              onSelect={(p) => {
                setSelectedId(p.parcel_id);
                setCheck(null);
                setDrawMode(false);
                setDrawn(null);
              }}
              satellite={satellite}
              height="min(620px, 65vh)"
              drawEnabled={drawMode}
              onDrawn={onDrawn}
            />
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--gov-text-muted)] mt-2">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 border-2 border-[var(--gov-green)] bg-green-100" />{t("Surveyed boundary")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-dashed border-[var(--gov-saffron)]" />{t("Approximate location (village / tehsil / district centre)")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[var(--gov-green)]" />{t("Verified")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[var(--gov-saffron)]" />{t("Under review")}</span>
          </div>
        </div>

        <Card title="Parcel">
          {!selected ? (
            <p className="text-sm text-[var(--gov-text-muted)]">{t("Select a parcel on the map to see its details.")}</p>
          ) : (
            <div className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div><dt className="text-[var(--gov-text-muted)]">{t("Record")}</dt><dd className="font-mono">{selected.record_id}</dd></div>
                <div><dt className="text-[var(--gov-text-muted)]">{t("Khasra")}</dt><dd className="font-semibold text-[var(--gov-navy)]">{selected.khasra_number || "—"}</dd></div>
                <div><dt className="text-[var(--gov-text-muted)]">{t("Owner")}</dt><dd>{selected.owner_name || "—"}</dd></div>
                <div><dt className="text-[var(--gov-text-muted)]">{t("Village")}</dt><dd>{selected.village}, {selected.district}</dd></div>
                <div><dt className="text-[var(--gov-text-muted)]">{t("Recorded area")}</dt><dd>{formatArea(selected.area, t(selected.area_unit), selected.area_hectares)}</dd></div>
                {selected.polygon_area_ha != null && (
                  <div><dt className="text-[var(--gov-text-muted)]">{t("Surveyed area")}</dt><dd>{selected.polygon_area_ha} {t("hectare")}</dd></div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <RecordStatusBadge status={selected.status} />
                  <Badge variant={selected.geometry_source === "surveyed" ? "success" : "warning"}>
                    {selected.geometry_source === "surveyed" ? t("Surveyed") : selected.geometry_source === "approximate" ? t("Approximate") : t("No location")}
                  </Badge>
                </div>
                {selected.location_note && <p className="text-xs text-[var(--gov-text-muted)]">{tx(selected.location_note)}</p>}
              </dl>

              {check && (
                <div className={`rounded-md border p-3 text-sm ${check.withinTolerance === false ? "border-amber-300 bg-amber-50" : "border-green-200 bg-green-50"}`}>
                  {t("Surveyed {surveyed} ha vs recorded {recorded} ha", { surveyed: check.polygonAreaHa, recorded: check.recordAreaHa?.toFixed(4) ?? "—" })}
                  {check.differencePct !== null && ` (${t("{n}% difference", { n: check.differencePct })})`}
                </div>
              )}

              {canEdit && (
                <div className="space-y-2 border-t border-[var(--gov-border-light)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gov-text-muted)]">{t("Surveyed boundary")}</p>
                  <label className="block">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gov-navy-light)] cursor-pointer">
                      <Upload className="h-4 w-4" /> {t("Upload GeoJSON or KML (WGS84)")}
                    </span>
                    <input
                      type="file"
                      accept=".geojson,.json,.kml"
                      className="sr-only"
                      disabled={saving}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("file", file);
                        void saveGeometry(fd);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={drawMode ? "primary" : "outline"} onClick={() => { setDrawMode(!drawMode); setDrawn(null); }}>
                      <PenLine className="h-3.5 w-3.5" /> {drawMode ? t("Cancel drawing") : t("Draw on map")}
                    </Button>
                    {drawn && (
                      <Button size="sm" loading={saving} onClick={() => saveGeometry({ geometry: drawn })}>
                        {t("Save drawn boundary")}
                      </Button>
                    )}
                  </div>
                  {drawMode && <p className="text-xs text-[var(--gov-text-muted)]">{t("Use the polygon tool (top-left of the map) and click around the plot; click the first point to finish.")}</p>}
                </div>
              )}

              <Link href={`/records/${selected.record_id}`}>
                <Button size="sm" variant="outline">{t("Open record")}</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function GISPage() {
  return (
    <AppLayout title="Map">
      <Suspense fallback={<LoadingState message="Loading map…" />}>
        <GISContent />
      </Suspense>
    </AppLayout>
  );
}

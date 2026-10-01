"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { MapView } from "@/components/gis/MapView";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { Parcel } from "@/types";
import { cn } from "@/lib/utils";

const DISTRICTS = ["", "Lucknow", "Malihabad", "Kanpur"];

function GISPageContent() {
  const searchParams = useSearchParams();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selected, setSelected] = useState<Parcel | null>(null);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [layers, setLayers] = useState({
    parcel: true,
    village: true,
    tehsil: false,
    cadastral: true,
  });

  const load = async (q?: string, d?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (d) params.set("district", d);
      const data = await apiGet<{ parcels: Parcel[] }>(`/api/gis?${params}`);
      setParcels(data.parcels);
    } catch {
      setParcels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "satellite") setSatellite(true);
    if (view === "parcels") setLayers((l) => ({ ...l, parcel: true, cadastral: true }));
    if (view === "boundaries") setLayers((l) => ({ ...l, village: true, tehsil: true }));
  }, [searchParams]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AppLayout title="GIS land parcel">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gov-navy)]">GIS land parcel</h1>
          <p className="text-sm text-[var(--gov-text-muted)]">
            Cadastral parcels linked to verified records — DILRMP / LRMS GIS integration (demo).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-end max-w-4xl">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase text-[var(--gov-text-muted)]">Search khasra / village / owner</label>
            <Input
              placeholder="235/1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(search, district)}
              className="mt-1"
            />
          </div>
          <Button onClick={() => load(search, district)}>Search</Button>
          <select
            value={district}
            onChange={(e) => { setDistrict(e.target.value); load(search, e.target.value); }}
            className="rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm h-10"
          >
            {DISTRICTS.map((d) => (
              <option key={d || "all"} value={d}>{d || "All districts"}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { key: "parcel" as const, label: "Parcel boundaries" },
            { key: "village" as const, label: "Village boundary" },
            { key: "tehsil" as const, label: "Tehsil boundary" },
            { key: "cadastral" as const, label: "Cadastral layer" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              className={cn(
                "rounded-full px-3 py-1 border font-medium",
                layers[key] ? "bg-[var(--gov-navy)] text-white border-[var(--gov-navy)]" : "bg-white border-[var(--gov-border)]"
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSatellite(!satellite)}
            className={cn(
              "rounded-full px-3 py-1 border font-medium",
              satellite ? "bg-[var(--gov-saffron)] text-white" : "bg-white"
            )}
          >
            {satellite ? "Satellite view" : "Road map"}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loading ? (
              <LoadingState message="Loading map..." />
            ) : (
              <MapView
                parcels={parcels}
                selectedParcel={selected}
                onSelectParcel={setSelected}
                height="600px"
                satellite={satellite}
                showParcelBoundaries={layers.parcel || layers.cadastral}
                showMarkers={layers.parcel}
              />
            )}
          </div>

          <div>
            <Card title="Land parcel details">
              {selected ? (
                <dl className="space-y-3 text-sm">
                  <div><dt className="text-[var(--gov-text-muted)]">Khasra</dt><dd className="font-semibold text-[var(--gov-navy)]">{selected.khasra_number}</dd></div>
                  <div><dt className="text-[var(--gov-text-muted)]">Owner</dt><dd className="font-medium">{selected.owner_name}</dd></div>
                  <div><dt className="text-[var(--gov-text-muted)]">Area</dt><dd className="font-medium">{selected.area} {selected.area_unit}</dd></div>
                  <div><dt className="text-[var(--gov-text-muted)]">Village</dt><dd>{selected.village}</dd></div>
                  <div>
                    <dt className="text-[var(--gov-text-muted)]">Status</dt>
                    <dd className="mt-1">
                      <Badge variant={selected.status === "VERIFIED" ? "success" : "warning"}>
                        {selected.status.replace(/_/g, " ")}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-[var(--gov-text-muted)]">Click a parcel on the map to view details.</p>
              )}
              {selected && (
                <Link href={`/records/${selected.record_id}`} className="inline-block mt-4">
                  <Button size="sm">View record</Button>
                </Link>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function GISPage() {
  return (
    <Suspense fallback={<AppLayout title="GIS land parcel"><LoadingState message="Loading map..." /></AppLayout>}>
      <GISPageContent />
    </Suspense>
  );
}

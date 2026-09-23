"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/gis/MapView";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-client";
import type { Parcel } from "@/types";

const DISTRICTS = ["", "Lucknow", "Malihabad", "Kanpur"];
const STATUSES = ["", "VERIFIED", "VERIFICATION_REQUIRED", "PENDING"];

export default function GISPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selected, setSelected] = useState<Parcel | null>(null);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (q?: string, d?: string, s?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (d) params.set("district", d);
      if (s) params.set("status", s);
      const data = await apiGet<{ parcels: Parcel[] }>(`/api/gis?${params}`);
      setParcels(data.parcels);
    } catch {
      setParcels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppLayout title="GIS Map">
      <div className="space-y-4">
        <PageHeader
          title="Cadastral GIS Map"
          description="Verified and pending parcels from the local database module (Member 6). Parcel boundaries are derived from record area and village location."
        />

        <div className="flex flex-wrap gap-2 max-w-4xl">
          <Input
            placeholder="Search khasra, owner, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, district, status)}
          />
          <select
            value={district}
            onChange={(e) => { setDistrict(e.target.value); load(search, e.target.value, status); }}
            className="rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm"
          >
            {DISTRICTS.map((d) => (
              <option key={d || "all"} value={d}>{d || "All Districts"}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); load(search, district, e.target.value); }}
            className="rounded-md border border-[var(--gov-border)] px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>{s ? s.replace(/_/g, " ") : "All Statuses"}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => load(search, district, status)}>Apply</Button>
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
              />
            )}
          </div>

          <div>
            {selected ? (
              <Card title="Parcel Details">
                <dl className="space-y-3 text-sm">
                  <div><dt className="text-slate-500">Khasra</dt><dd className="font-medium">{selected.khasra_number}</dd></div>
                  <div><dt className="text-slate-500">Owner</dt><dd className="font-medium">{selected.owner_name}</dd></div>
                  <div><dt className="text-slate-500">Area</dt><dd className="font-medium">{selected.area} {selected.area_unit}</dd></div>
                  <div><dt className="text-slate-500">Village</dt><dd className="font-medium">{selected.village}</dd></div>
                  <div><dt className="text-slate-500">District</dt><dd className="font-medium">{selected.district}</dd></div>
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="mt-1">
                      <Badge variant={selected.status === "VERIFIED" ? "success" : "warning"}>
                        {selected.status.replace(/_/g, " ")}
                      </Badge>
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link href={`/records/${selected.record_id}`}>
                    <Button variant="outline" size="sm">View Land Record</Button>
                  </Link>
                  {selected.status !== "VERIFIED" && (
                    <Link href={`/verification/${selected.record_id}`}>
                      <Button size="sm">Verify</Button>
                    </Link>
                  )}
                </div>
              </Card>
            ) : (
              <Card title="Parcel Details">
                <p className="text-sm text-slate-500">Click a parcel marker or polygon on the map to view details.</p>
              </Card>
            )}

            <Card title="Parcels" className="mt-4 max-h-[300px] overflow-y-auto">
              <div className="space-y-2">
                {parcels.map((p) => (
                  <button
                    key={p.parcel_id}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                      selected?.parcel_id === p.parcel_id
                        ? "border-slate-800 bg-slate-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium">{p.khasra_number} — {p.owner_name}</p>
                    <p className="text-xs text-slate-500">{p.village}, {p.district}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

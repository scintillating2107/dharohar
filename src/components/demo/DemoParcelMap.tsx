"use client";

import { useState } from "react";
import { MapView } from "@/components/gis/MapView";
import {
  DEMO_PARCELS,
  DEMO_PORTAL_PROPERTY,
  parcelToSelection,
  type DemoParcelSelection,
} from "@/lib/demo-portal-data";
import type { Parcel } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function DemoParcelMap({
  onSelectParcel,
  height = "220px",
}: {
  onSelectParcel?: (parcel: DemoParcelSelection) => void;
  height?: string;
}) {
  const [selected, setSelected] = useState<Parcel | null>(DEMO_PARCELS[0]);

  const handleSelect = (p: Parcel) => {
    setSelected(p);
    onSelectParcel?.(parcelToSelection(p, "4f8a21c9e2b7…82cd"));
  };

  return (
    <MapView
      parcels={DEMO_PARCELS}
      selectedParcel={selected}
      onSelectParcel={handleSelect}
      height={height}
      showParcelBoundaries
      showMarkers
    />
  );
}

export function DemoParcelSidePanel({
  parcel,
  txInfo,
}: {
  parcel: DemoParcelSelection | null;
  txInfo: { hash: string; block: number; ts: string; nodeId: string } | null;
}) {
  const p = parcel;
  const hash = p?.hash || txInfo?.hash || "4f8a21c9e2b7…82cd";

  return (
    <div className="gov-card p-4 text-xs text-[var(--gov-navy)] space-y-2">
      <p className="font-semibold text-sm">Parcel on map</p>
      {!p ? (
        <p className="text-[var(--gov-text-muted)]">Click a highlighted parcel on the map.</p>
      ) : (
        <>
          <div>Owner: {p.ownerName}</div>
          <div>Khasra: {p.surveyNumber}</div>
          <div>Village: {p.village}</div>
          <div>Area: {p.area}</div>
          <div className="font-mono text-[10px] break-all">Cert hash: {hash}</div>
          {p.recordId && (
            <Link href={`/records/${p.recordId}`}>
              <Button size="sm" variant="outline" className="w-full mt-2">Open record {p.recordId}</Button>
            </Link>
          )}
        </>
      )}
      <Link href="/trust/verify" className="block mt-2">
        <Button size="sm" variant="ghost" className="w-full text-xs">Open trust verify page</Button>
      </Link>
    </div>
  );
}

export function DemoParcelMiniPreview() {
  return (
    <div className="relative h-36 bg-slate-100 rounded-md overflow-hidden border border-[var(--gov-border)]">
      <svg viewBox="0 0 200 140" className="w-full h-full" aria-hidden>
        <rect width="200" height="140" fill="#e8eef4" />
        <path
          d="M40 90 L80 40 L150 55 L160 105 L90 120 Z"
          fill="#c5daf0"
          stroke="var(--gov-navy)"
          strokeWidth="2"
        />
        <text x="100" y="78" textAnchor="middle" fontSize="9" fill="#0c2340">
          Khasra {DEMO_PORTAL_PROPERTY.surveyNumber}
        </text>
      </svg>
    </div>
  );
}

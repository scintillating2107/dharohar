"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/States";
import type { Parcel } from "@/types";
import type { MapInnerProps } from "./MapInner";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <LoadingState message="Loading map…" />,
});

interface LegacyProps {
  /** @deprecated use selectedId (kept for the retired demo components) */
  selectedParcel?: Parcel | null;
  /** @deprecated use onSelect */
  onSelectParcel?: (parcel: Parcel) => void;
  showParcelBoundaries?: boolean;
  showMarkers?: boolean;
}

export function MapView({
  height = "500px",
  selectedParcel,
  onSelectParcel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showParcelBoundaries,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showMarkers,
  ...props
}: MapInnerProps & LegacyProps & { height?: string }) {
  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-[var(--gov-border-light)] relative z-0">
      <MapInner
        {...props}
        selectedId={props.selectedId ?? selectedParcel?.parcel_id ?? null}
        onSelect={props.onSelect ?? onSelectParcel}
      />
    </div>
  );
}

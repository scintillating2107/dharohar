"use client";

import { useEffect, useState, Fragment } from "react";
import dynamic from "next/dynamic";
import type { Parcel } from "@/types";
import { LoadingState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);

interface MapViewProps {
  parcels: Parcel[];
  selectedParcel?: Parcel | null;
  onSelectParcel?: (parcel: Parcel) => void;
  height?: string;
}

function polygonPositions(parcel: Parcel): [number, number][] {
  if (parcel.geometry?.type === "Polygon") {
    return parcel.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
  }
  return [];
}

export function MapView({
  parcels,
  selectedParcel,
  onSelectParcel,
  height = "500px",
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });
  }, []);

  if (!mounted) return <LoadingState message="Loading map..." />;

  const center = selectedParcel?.center ||
    parcels[0]?.center || { lat: 26.8467, lng: 80.9462 };

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {parcels.map((parcel) => {
          const positions = polygonPositions(parcel);
          const isSelected = selectedParcel?.parcel_id === parcel.parcel_id;
          return (
            <Fragment key={parcel.parcel_id}>
              {positions.length > 0 && (
                <Polygon
                  pathOptions={{
                    color: parcel.status === "VERIFIED" ? "#1a7f37" : "#e8750a",
                    fillColor: parcel.status === "VERIFIED" ? "#1a7f37" : "#e8750a",
                    fillOpacity: isSelected ? 0.35 : 0.2,
                    weight: isSelected ? 3 : 2,
                  }}
                  positions={positions}
                  eventHandlers={{ click: () => onSelectParcel?.(parcel) }}
                />
              )}
              <Marker
                position={[parcel.center.lat, parcel.center.lng]}
                eventHandlers={{ click: () => onSelectParcel?.(parcel) }}
              >
                <Popup>
                  <div className="text-sm space-y-1 min-w-[160px]">
                    <p><strong>Khasra:</strong> {parcel.khasra_number}</p>
                    <p><strong>Owner:</strong> {parcel.owner_name}</p>
                    <p><strong>Area:</strong> {parcel.area} {parcel.area_unit}</p>
                    <p><strong>Village:</strong> {parcel.village}</p>
                    <Badge variant={parcel.status === "VERIFIED" ? "success" : "warning"}>
                      {parcel.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

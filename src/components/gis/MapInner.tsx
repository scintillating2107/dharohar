"use client";

import { Fragment, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import type { Parcel } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

export interface MapInnerProps {
  parcels: Parcel[];
  selectedId?: string | null;
  onSelect?: (parcel: Parcel) => void;
  satellite?: boolean;
  /** When set, the user can draw one polygon; the GeoJSON geometry is passed back */
  onDrawn?: (geometry: GeoJSON.Polygon) => void;
  drawEnabled?: boolean;
}

const INDIA_CENTER: [number, number] = [26.85, 80.95];

function colorFor(p: Parcel) {
  return p.status === "VERIFIED" ? "#1a7f37" : p.status === "REJECTED" ? "#dc2626" : "#e8750a";
}

/** Fits the view to the parcels (or the selected one) whenever they change. */
function FitBounds({ parcels, selectedId }: { parcels: Parcel[]; selectedId?: string | null }) {
  const map = useMap();
  useEffect(() => {
    const target = selectedId ? parcels.filter((p) => p.parcel_id === selectedId) : parcels;
    const bounds = L.latLngBounds([]);
    for (const p of target) {
      if (p.geometry) bounds.extend(L.geoJSON(p.geometry as GeoJSON.GeoJsonObject).getBounds());
      else if (p.center) bounds.extend([p.center.lat, p.center.lng]);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: selectedId ? 17 : 13 });
  }, [map, parcels, selectedId]);
  return null;
}

function DrawControl({ enabled, onDrawn }: { enabled: boolean; onDrawn?: (g: GeoJSON.Polygon) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !onDrawn) return;
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawCircle: false,
      drawText: false,
      cutPolygon: false,
      rotateMode: false,
      editMode: true,
      dragMode: false,
      removalMode: true,
    });
    const handler = (e: { layer: L.Layer }) => {
      const layer = e.layer as L.Polygon;
      const feature = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
      onDrawn(feature.geometry);
      layer.on("pm:edit", () => onDrawn((layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>).geometry));
    };
    map.on("pm:create", handler);
    return () => {
      map.off("pm:create", handler);
      map.pm.removeControls();
    };
  }, [map, enabled, onDrawn]);
  return null;
}

export default function MapInner({ parcels, selectedId, onSelect, satellite, onDrawn, drawEnabled }: MapInnerProps) {
  const { t } = useLocale();
  return (
    <MapContainer center={INDIA_CENTER} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution={satellite ? "Imagery &copy; Esri" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
        url={
          satellite
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
      />
      <FitBounds parcels={parcels} selectedId={selectedId} />
      <DrawControl enabled={Boolean(drawEnabled)} onDrawn={onDrawn} />
      {parcels.map((p) => {
        const selected = p.parcel_id === selectedId;
        const color = colorFor(p);
        const popup = (
          <Popup>
            <div className="text-sm space-y-0.5 min-w-[180px]">
              <p className="font-semibold">{p.record_id}</p>
              <p>{t("Khasra")} {p.khasra_number} · {p.village}</p>
              <p>{p.owner_name}</p>
              <p className="text-xs">{p.geometry_source === "surveyed" ? t("Surveyed: {n} ha", { n: p.polygon_area_ha ?? 0 }) : t("Approximate location")}</p>
            </div>
          </Popup>
        );
        return (
          <Fragment key={p.parcel_id}>
            {p.geometry ? (
              <GeoJSON
                key={`${p.parcel_id}-${selected}-${p.updated_at}`}
                data={p.geometry as GeoJSON.GeoJsonObject}
                style={{ color, weight: selected ? 4 : 2, fillOpacity: selected ? 0.35 : 0.2 }}
                eventHandlers={{ click: () => onSelect?.(p) }}
              >
                {popup}
              </GeoJSON>
            ) : p.center ? (
              <CircleMarker
                center={[p.center.lat, p.center.lng]}
                radius={selected ? 11 : 8}
                pathOptions={{ color, dashArray: "4 3", weight: 2, fillOpacity: 0.25 }}
                eventHandlers={{ click: () => onSelect?.(p) }}
              >
                {popup}
              </CircleMarker>
            ) : null}
          </Fragment>
        );
      })}
    </MapContainer>
  );
}

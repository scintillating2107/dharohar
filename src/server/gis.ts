import turfArea from "@turf/area";
import turfCentroid from "@turf/centroid";
import { eq } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import { getDb } from "@/server/db/client";
import { masterLocations, parcels, records } from "@/server/db/schema";
import { newId } from "@/server/crypto";
import { env } from "@/server/env";
import type { CanonicalLocation } from "@/server/master";
import { invalidateMasterCache } from "@/server/master";
import type { RecordRow } from "@/server/repo";
import type { ValidationResult } from "@/types";

const INDIA_BBOX = { minLat: 6, maxLat: 37.5, minLng: 68, maxLng: 97.5 };

export interface ApproximateLocation {
  lat: number | null;
  lng: number | null;
  source: "approximate" | "none";
  note: string;
}

/**
 * Resolves the best-known location for a record without a surveyed boundary. Runs outside any
 * transaction because geocoding may write to master data.
 */
export async function resolveApproximateLocation(
  place: { village: string; district: string; state: string },
  canonical: Pick<CanonicalLocation, "lat" | "lng" | "precision">
): Promise<ApproximateLocation> {
  if (canonical.lat != null && canonical.lng != null) {
    return {
      lat: canonical.lat,
      lng: canonical.lng,
      source: "approximate",
      note: `Approximate location: ${canonical.precision} centre from master data. Upload a surveyed boundary for exact geometry.`,
    };
  }
  const geo = env.geocoder === "nominatim" ? await geocodePlace(place.village, place.district, place.state) : null;
  if (geo) {
    return { ...geo, source: "approximate", note: "Approximate location: geocoded village name (OpenStreetMap Nominatim)." };
  }
  return {
    lat: null,
    lng: null,
    source: "none",
    note: "No location available: village/district not in master data. Upload a surveyed boundary.",
  };
}

/** Creates or refreshes the parcel for a record. Surveyed geometry is never overwritten here. */
export async function upsertApproximateParcel(tx: DB, recordId: string, location: ApproximateLocation): Promise<void> {
  const [existing] = await tx.select().from(parcels).where(eq(parcels.recordId, recordId));
  if (existing?.geometrySource === "surveyed") return;
  const values = {
    geometry: null,
    geometrySource: location.source,
    polygonAreaHa: null,
    centerLat: location.lat,
    centerLng: location.lng,
    locationNote: location.note,
    updatedAt: new Date().toISOString(),
  };
  if (existing) await tx.update(parcels).set(values).where(eq(parcels.id, existing.id));
  else await tx.insert(parcels).values({ id: newId("P"), recordId, ...values });
}

/** OpenStreetMap Nominatim lookup (opt-in via GEOCODER=nominatim); results cached in master data. */
export async function geocodePlace(
  village: string,
  district: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  if (!village || !district) return null;
  try {
    const q = [village, district, state, "India"].filter(Boolean).join(", ");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "Dharohar-LRMS/1.0 (land record digitization)" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const hits = (await res.json()) as { lat: string; lon: string }[];
    if (!hits[0]) return null;
    const lat = parseFloat(hits[0].lat);
    const lng = parseFloat(hits[0].lon);
    if (!insideIndia(lat, lng)) return null;
    const db = await getDb();
    await db.insert(masterLocations).values({ level: "village", state, district, village, lat, lng });
    invalidateMasterCache();
    return { lat, lng };
  } catch {
    return null;
  }
}

function insideIndia(lat: number, lng: number): boolean {
  return lat >= INDIA_BBOX.minLat && lat <= INDIA_BBOX.maxLat && lng >= INDIA_BBOX.minLng && lng <= INDIA_BBOX.maxLng;
}

type PolygonGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

/** Accepts GeoJSON (geometry, Feature, FeatureCollection) or KML text; returns the first polygon. */
export async function parseBoundary(text: string, fileName = ""): Promise<PolygonGeometry> {
  const trimmed = text.trim();
  let geo: GeoJSON.GeoJSON;
  if (trimmed.startsWith("<") || /\.kml$/i.test(fileName)) {
    const [{ DOMParser }, { kml }] = await Promise.all([import("@xmldom/xmldom"), import("@tmcw/togeojson")]);
    const dom = new DOMParser().parseFromString(trimmed, "text/xml");
    geo = kml(dom as unknown as Document) as GeoJSON.FeatureCollection;
  } else {
    geo = JSON.parse(trimmed) as GeoJSON.GeoJSON;
  }
  const geometries: GeoJSON.Geometry[] =
    geo.type === "FeatureCollection"
      ? geo.features.map((f) => f.geometry).filter(Boolean)
      : geo.type === "Feature"
        ? [geo.geometry]
        : [geo as GeoJSON.Geometry];
  const polygon = geometries.find((g) => g?.type === "Polygon" || g?.type === "MultiPolygon") as PolygonGeometry | undefined;
  if (!polygon) throw new Error("No Polygon or MultiPolygon found in the boundary file");
  return polygon;
}

export function validatePolygon(geometry: PolygonGeometry): void {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  if (!rings.length || rings.some((r) => r.length < 4)) throw new Error("Polygon rings need at least 4 positions");
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !insideIndia(lat, lng)) {
        throw new Error("Boundary coordinates must be WGS84 longitude/latitude inside India");
      }
    }
  }
}

export interface GeometryUpdateResult {
  polygonAreaHa: number;
  recordAreaHa: number | null;
  differencePct: number | null;
  withinTolerance: boolean | null;
}

/** Stores a surveyed boundary, computes its geodesic area and cross-checks the recorded area. */
export async function setSurveyedGeometry(
  tx: DB,
  record: RecordRow,
  geometry: PolygonGeometry,
  userId: string,
  tolerancePct: number
): Promise<GeometryUpdateResult> {
  validatePolygon(geometry);
  const feature: GeoJSON.Feature<PolygonGeometry> = { type: "Feature", properties: {}, geometry };
  const polygonAreaHa = Math.round((turfArea(feature) / 10000) * 10000) / 10000;
  const [lng, lat] = turfCentroid(feature).geometry.coordinates;

  const values = {
    geometry,
    geometrySource: "surveyed",
    polygonAreaHa,
    centerLat: lat,
    centerLng: lng,
    locationNote: "Surveyed boundary",
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  const [existing] = await tx.select().from(parcels).where(eq(parcels.recordId, record.id));
  if (existing) await tx.update(parcels).set(values).where(eq(parcels.id, existing.id));
  else await tx.insert(parcels).values({ id: newId("P"), recordId: record.id, ...values });

  const recordAreaHa = record.areaHectares;
  const differencePct =
    recordAreaHa && recordAreaHa > 0 ? Math.round((Math.abs(polygonAreaHa - recordAreaHa) / recordAreaHa) * 1000) / 10 : null;
  const withinTolerance = differencePct === null ? null : differencePct <= tolerancePct;

  // Reflect the spatial cross-check in the record's validation result
  if (record.validation) {
    const validation: ValidationResult = {
      ...record.validation,
      warnings: record.validation.warnings.filter((w) => w.type !== "PARCEL_AREA_MISMATCH"),
      passed_checks: (record.validation.passed_checks ?? []).filter((p) => !p.startsWith("Surveyed parcel area")),
    };
    if (withinTolerance === false) {
      validation.warnings.push({
        field: "area",
        type: "PARCEL_AREA_MISMATCH",
        message: `Surveyed boundary area differs from recorded area by ${differencePct}% (tolerance ${tolerancePct}%)`,
        current_value: `${polygonAreaHa} ha (surveyed)`,
        previous_value: `${recordAreaHa?.toFixed(4)} ha (record)`,
      });
      if (validation.validation_status === "VALID") validation.validation_status = "REVIEW_REQUIRED";
    } else if (withinTolerance) {
      validation.passed_checks!.push(`Surveyed parcel area ${polygonAreaHa} ha matches record (±${differencePct}%)`);
    }
    await tx.update(records).set({ validation }).where(eq(records.id, record.id));
  }

  return { polygonAreaHa, recordAreaHa, differencePct, withinTolerance };
}

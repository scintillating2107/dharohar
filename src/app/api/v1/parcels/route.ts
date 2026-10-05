import { and, eq, ilike, type SQL } from "drizzle-orm";
import { requireApiAccess } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { parcels, records } from "@/server/db/schema";
import { v1Error } from "@/server/api-v1";

/** GeoJSON FeatureCollection of parcels for verified records (polygons when surveyed, points otherwise). */
export async function GET(request: Request) {
  try {
    await requireApiAccess(request, "parcels:read");
    const url = new URL(request.url);
    const conds: SQL[] = [eq(records.status, "VERIFIED")];
    const district = url.searchParams.get("district");
    if (district) conds.push(ilike(records.district, district));
    const village = url.searchParams.get("village");
    if (village) conds.push(ilike(records.village, village));
    if (url.searchParams.get("surveyed_only") === "true") conds.push(eq(parcels.geometrySource, "surveyed"));
    const db = await getDb();
    const rows = await db
      .select({ parcel: parcels, record: records })
      .from(parcels)
      .innerJoin(records, eq(records.id, parcels.recordId))
      .where(and(...conds))
      .limit(5000);
    const features = rows
      .map(({ parcel, record }) => {
        const geometry: GeoJSON.Geometry | null =
          parcel.geometry ??
          (parcel.centerLat != null && parcel.centerLng != null
            ? { type: "Point", coordinates: [parcel.centerLng, parcel.centerLat] }
            : null);
        if (!geometry) return null;
        return {
          type: "Feature" as const,
          id: parcel.id,
          geometry,
          properties: {
            record_id: record.id,
            khasra_number: record.khasraNumber,
            khata_number: record.khataNumber,
            owner_name: record.ownerName,
            village: record.village,
            tehsil: record.tehsil,
            district: record.district,
            state: record.state,
            area_hectares: record.areaHectares,
            surveyed_area_hectares: parcel.polygonAreaHa,
            geometry_source: parcel.geometrySource,
          },
        };
      })
      .filter(Boolean);
    return Response.json({ type: "FeatureCollection", features }, { headers: { "Content-Type": "application/geo+json" } });
  } catch (err) {
    return v1Error(err);
  }
}

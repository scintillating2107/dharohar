import type { Parcel } from "@/types";

const LUCKNOW_CENTER = { lat: 26.8467, lng: 80.9462 };

const DISTRICT_OFFSETS: Record<string, { lat: number; lng: number }> = {
  Lucknow: { lat: 0, lng: 0 },
  Malihabad: { lat: -0.06, lng: -0.23 },
  Kanpur: { lat: -0.35, lng: 0.12 },
  default: { lat: 0.02, lng: 0.02 },
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function deriveParcelCenter(
  village: string,
  district: string,
  khasraNumber: string
): { lat: number; lng: number } {
  const districtOffset = DISTRICT_OFFSETS[district] || DISTRICT_OFFSETS.default;
  const seed = hashString(`${district}|${village}|${khasraNumber}`);
  const latJitter = ((seed % 1000) / 1000 - 0.5) * 0.04;
  const lngJitter = (((seed >> 10) % 1000) / 1000 - 0.5) * 0.04;

  return {
    lat: LUCKNOW_CENTER.lat + districtOffset.lat + latJitter,
    lng: LUCKNOW_CENTER.lng + districtOffset.lng + lngJitter,
  };
}

export function deriveParcelGeometry(
  center: { lat: number; lng: number },
  areaHectares: number
): GeoJSON.Polygon {
  const sideDegrees = Math.sqrt(Math.max(areaHectares, 0.01)) * 0.0012;
  const half = sideDegrees / 2;

  return {
    type: "Polygon",
    coordinates: [
      [
        [center.lng - half, center.lat - half],
        [center.lng + half, center.lat - half],
        [center.lng + half, center.lat + half],
        [center.lng - half, center.lat + half],
        [center.lng - half, center.lat - half],
      ],
    ],
  };
}

export function enrichParcel(parcel: Omit<Parcel, "center" | "geometry"> & Partial<Pick<Parcel, "center" | "geometry">>): Parcel {
  const center =
    parcel.center ||
    deriveParcelCenter(parcel.village, parcel.district, parcel.khasra_number);

  return {
    ...parcel,
    center,
    geometry: parcel.geometry || deriveParcelGeometry(center, parcel.area),
  };
}

import { DEMO_RECORD_ID } from "@/lib/record-ids";
import type { Parcel } from "@/types";

export const DEMO_PORTAL_PROPERTY = {
  ownerName: "Ram Singh",
  fatherName: "Mohan Singh",
  surveyNumber: "235/1",
  khata: "124",
  village: "Chinhat",
  district: "Lucknow",
  state: "Uttar Pradesh",
  landArea: "1.80 hectare (18,000 sq m)",
  recordId: DEMO_RECORD_ID,
};

export const DEMO_PORTAL_STEPS = [
  { id: 1, label: "Citizen identity" },
  { id: 2, label: "Land registration & GIS" },
  { id: 3, label: "Government approval" },
  { id: 4, label: "Ledger certification" },
  { id: 5, label: "Public verification" },
] as const;

export const DEMO_PARCELS: Parcel[] = [
  {
    parcel_id: "P-DEMO-235-1",
    record_id: DEMO_RECORD_ID,
    khasra_number: "235/1",
    owner_name: "Ram Singh",
    area: 1.8,
    area_unit: "hectare",
    village: "Chinhat",
    district: "Lucknow",
    status: "VERIFIED",
    center: { lat: 26.872, lng: 80.995 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [80.992, 26.869],
          [80.998, 26.869],
          [80.999, 26.874],
          [80.993, 26.875],
          [80.992, 26.869],
        ],
      ],
    },
  },
  {
    parcel_id: "P-DEMO-236-2",
    record_id: "",
    khasra_number: "236/2",
    owner_name: "Adjacent parcel (demo)",
    area: 0.95,
    area_unit: "hectare",
    village: "Chinhat",
    district: "Lucknow",
    status: "VERIFICATION_REQUIRED",
    center: { lat: 26.871, lng: 81.002 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [81.0, 26.87],
          [81.004, 26.87],
          [81.004, 26.873],
          [81.0, 26.873],
          [81.0, 26.87],
        ],
      ],
    },
  },
];

export type DemoParcelSelection = {
  id: string;
  ownerName: string;
  surveyNumber: string;
  village: string;
  area: string;
  hash?: string;
  recordId?: string;
};

export function parcelToSelection(p: Parcel, hash?: string): DemoParcelSelection {
  return {
    id: p.parcel_id,
    ownerName: p.owner_name,
    surveyNumber: p.khasra_number,
    village: p.village,
    area: `${p.area} ${p.area_unit}`,
    hash,
    recordId: p.record_id || undefined,
  };
}

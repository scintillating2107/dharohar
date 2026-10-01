import { NextRequest } from "next/server";
import { persistParcelLocal, listParcelsLocal } from "@/lib/member-local";
import { apiSuccess, apiError } from "@/lib/api-utils";
import type { Parcel } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parcels = await listParcelsLocal({
    district: searchParams.get("district") || undefined,
    village: searchParams.get("village") || undefined,
  });
  return apiSuccess(parcels);
}

export async function POST(request: NextRequest) {
  try {
    const parcel = (await request.json()) as Parcel;
    if (!parcel?.parcel_id) return apiError("parcel_id is required");
    const result = await persistParcelLocal(parcel);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Persist parcel failed", 500);
  }
}

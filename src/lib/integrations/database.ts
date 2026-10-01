import type { LandRecord, Parcel } from "@/types";
import {
  persistRecordLocal,
  persistParcelLocal,
  fetchRecordLocal,
  listParcelsLocal,
} from "@/lib/services/local";
import { callExternal, callExternalGet, INTEGRATION_URLS, isMockMode } from "./client";

export async function persistRecord(record: LandRecord): Promise<{ success: boolean }> {
  if (isMockMode()) return { success: true };

  if (INTEGRATION_URLS.database) {
    return callExternal<{ success: boolean }>(
      "Database (Member 6)",
      `${INTEGRATION_URLS.database}/records`,
      record
    );
  }

  await persistRecordLocal(record);
  return { success: true };
}

export async function persistParcel(parcel: Parcel): Promise<{ success: boolean }> {
  if (isMockMode()) return { success: true };

  if (INTEGRATION_URLS.database) {
    return callExternal<{ success: boolean }>(
      "Database (Member 6)",
      `${INTEGRATION_URLS.database}/parcels`,
      parcel
    );
  }

  await persistParcelLocal(parcel);
  return { success: true };
}

export async function fetchRecordFromDb(recordId: string): Promise<LandRecord | null> {
  if (isMockMode()) return null;

  if (INTEGRATION_URLS.database) {
    try {
      return await callExternalGet<LandRecord>(
        "Database (Member 6)",
        `${INTEGRATION_URLS.database}/records/${recordId}`
      );
    } catch {
      return null;
    }
  }

  return fetchRecordLocal(recordId);
}

export async function fetchParcelsFromDb(filters?: {
  district?: string;
  village?: string;
}): Promise<Parcel[]> {
  if (INTEGRATION_URLS.database && !isMockMode()) {
    try {
      const params = new URLSearchParams();
      if (filters?.district) params.set("district", filters.district);
      if (filters?.village) params.set("village", filters.village);
      const parcelRes = await callExternalGet<{ features?: unknown[] } | Parcel[]>(
        "Database (Member 6)",
        `${INTEGRATION_URLS.database}/parcels?${params}`
      );
      if (Array.isArray(parcelRes)) return parcelRes;
      return listParcelsLocal(filters);
    } catch {
      return listParcelsLocal(filters);
    }
  }

  return listParcelsLocal(filters);
}

export async function checkIntegrationHealth(): Promise<
  Record<string, { status: "mock" | "local" | "connected" | "unconfigured"; url?: string }>
> {
  const modules = {
    member2_image: INTEGRATION_URLS.imageProcessing,
    member3_ocr: INTEGRATION_URLS.ocr,
    member4_extraction: INTEGRATION_URLS.extraction,
    member5_validation: INTEGRATION_URLS.validation,
    member6_database: INTEGRATION_URLS.database,
  };

  const result: Record<string, { status: "mock" | "local" | "connected" | "unconfigured"; url?: string }> = {};

  for (const [key, url] of Object.entries(modules)) {
    if (isMockMode()) {
      result[key] = { status: "mock" };
    } else if (url) {
      result[key] = { status: "connected", url };
    } else {
      result[key] = { status: "local" };
    }
  }

  return result;
}

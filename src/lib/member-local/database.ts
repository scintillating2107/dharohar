import type { LandRecord, Parcel } from "@/types";
import { store } from "@/lib/store";

export async function persistRecordLocal(record: LandRecord): Promise<{ success: boolean; record_id: string }> {
  const existing = store.getRecord(record.record_id);
  if (existing) {
    store.updateRecord(record.record_id, record);
  } else {
    store.addRecord(record);
  }
  return { success: true, record_id: record.record_id };
}

export async function persistParcelLocal(parcel: Parcel): Promise<{ success: boolean; parcel_id: string }> {
  const existing = store.getParcelByRecord(parcel.record_id);
  if (existing) {
    store.updateParcelByRecord(parcel.record_id, parcel);
  } else {
    store.addParcel(parcel);
  }
  return { success: true, parcel_id: parcel.parcel_id };
}

export async function fetchRecordLocal(recordId: string): Promise<LandRecord | null> {
  return store.getRecord(recordId) || null;
}

export async function listParcelsLocal(filters?: {
  district?: string;
  village?: string;
}): Promise<Parcel[]> {
  let parcels = [...store.parcels];
  if (filters?.district) parcels = parcels.filter((p) => p.district === filters.district);
  if (filters?.village) parcels = parcels.filter((p) => p.village === filters.village);
  return parcels;
}

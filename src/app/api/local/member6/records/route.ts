import { NextRequest } from "next/server";
import { persistRecordLocal } from "@/lib/member-local";
import { apiSuccess, apiError } from "@/lib/api-utils";
import type { LandRecord } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const record = (await request.json()) as LandRecord;
    if (!record?.record_id) return apiError("record_id is required");
    const result = await persistRecordLocal(record);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Persist record failed", 500);
  }
}

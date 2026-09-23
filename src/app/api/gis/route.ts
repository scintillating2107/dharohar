import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district");
  const village = searchParams.get("village");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();

  let parcels = [...store.parcels];

  if (district) parcels = parcels.filter((p) => p.district === district);
  if (status) parcels = parcels.filter((p) => p.status === status);
  if (village) parcels = parcels.filter((p) => p.village === village);
  if (search) {
    parcels = parcels.filter(
      (p) =>
        p.khasra_number.toLowerCase().includes(search) ||
        p.owner_name.toLowerCase().includes(search) ||
        p.village.toLowerCase().includes(search)
    );
  }

  return apiSuccess({ parcels });
}

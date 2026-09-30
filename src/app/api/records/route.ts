import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { isCitizenRole, citizenCanViewRecord } from "@/lib/citizen";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();
  const district = searchParams.get("district");

  let items = [...store.records];
  const user = store.users.find((u) => u.id === session.userId);

  if (isCitizenRole(session.role) && user) {
    items = items.filter((r) => citizenCanViewRecord(r, user));
  }

  if (status) items = items.filter((r) => r.status === status);
  if (district) items = items.filter((r) => r.district === district);
  if (search) {
    items = items.filter(
      (r) =>
        r.record_id.toLowerCase().includes(search) ||
        r.owner_name.toLowerCase().includes(search) ||
        r.khasra_number.toLowerCase().includes(search) ||
        r.khata_number.toLowerCase().includes(search) ||
        r.village.toLowerCase().includes(search) ||
        r.tehsil.toLowerCase().includes(search) ||
        r.district.toLowerCase().includes(search)
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;

  return apiSuccess({
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

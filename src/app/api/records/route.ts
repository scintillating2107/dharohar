import { requireUser } from "@/server/auth";
import { claimedRecordIds } from "@/server/citizen";
import { listRecords } from "@/server/repo";
import { handle, paginated, pagination } from "@/server/http";

export const GET = handle(async (request: Request) => {
  const user = await requireUser("records");
  const url = new URL(request.url);
  const { page, pageSize, limit, offset } = pagination(url);
  const { items, total } = await listRecords({
    status: url.searchParams.get("status"),
    district: url.searchParams.get("district"),
    search: url.searchParams.get("search")?.trim() || null,
    validationStatus: url.searchParams.get("validationStatus"),
    duplicatesOnly: url.searchParams.get("duplicates") === "1",
    citizenRecordIds: user.role === "CITIZEN" ? await claimedRecordIds(user.id) : undefined,
    limit,
    offset,
  });
  return paginated(items, total, page, pageSize);
});

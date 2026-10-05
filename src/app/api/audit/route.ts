import { requireUser } from "@/server/auth";
import { listAudit } from "@/server/audit";
import { handle, paginated, pagination } from "@/server/http";

export const GET = handle(async (request: Request) => {
  await requireUser("audit");
  const url = new URL(request.url);
  const { page, pageSize, limit, offset } = pagination(url, 30);
  const { items, total } = await listAudit({
    recordId: url.searchParams.get("recordId")?.trim() || undefined,
    documentId: url.searchParams.get("documentId")?.trim() || undefined,
    limit,
    offset,
  });
  return paginated(items, total, page, pageSize);
});

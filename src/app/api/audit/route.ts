import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const recordId = searchParams.get("recordId");
  const documentId = searchParams.get("documentId");

  let items = [...store.auditEvents];

  if (recordId) items = items.filter((e) => e.recordId === recordId);
  if (documentId) items = items.filter((e) => e.documentId === documentId);

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

import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const status = searchParams.get("status");
  const district = searchParams.get("district");
  const lowConfidence = searchParams.get("lowConfidence") === "true";
  const validationIssue = searchParams.get("validationIssue") === "true";
  const search = searchParams.get("search")?.toLowerCase();

  let items = [...store.verificationTasks];

  if (status) items = items.filter((t) => t.status === status);
  if (district) items = items.filter((t) => t.district === district);
  if (lowConfidence) items = items.filter((t) => t.confidence < 0.8);
  if (validationIssue)
    items = items.filter((t) => t.validationStatus === "REVIEW_REQUIRED");
  if (search) {
    items = items.filter(
      (t) =>
        t.recordId.toLowerCase().includes(search) ||
        t.ownerName.toLowerCase().includes(search) ||
        t.khasraNumber.toLowerCase().includes(search) ||
        t.village.toLowerCase().includes(search)
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

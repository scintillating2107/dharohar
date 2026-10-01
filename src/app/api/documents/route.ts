import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store, generateId, createInitialSteps } from "@/lib/store";
import { saveUploadedFile, fileUrl } from "@/lib/file-storage";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/config";
import { apiSuccess, unauthorized, apiError } from "@/lib/api-utils";
import type { Document } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();

  let items = [...store.documents];

  if (status) {
    items = items.filter((d) => d.status === status);
  }
  if (search) {
    items = items.filter(
      (d) =>
        d.name.toLowerCase().includes(search) ||
        d.id.toLowerCase().includes(search) ||
        d.district?.toLowerCase().includes(search)
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);

  return apiSuccess({
    items: paginated,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const district = (formData.get("district") as string | null)?.trim() || undefined;
    const state = (formData.get("state") as string | null)?.trim() || "Uttar Pradesh";
    const nameOverride = (formData.get("name") as string | null)?.trim();
    const tehsil = (formData.get("tehsil") as string | null)?.trim() || undefined;
    const village = (formData.get("village") as string | null)?.trim() || undefined;
    const recordYear = (formData.get("recordYear") as string | null)?.trim() || undefined;
    const recordType = (formData.get("recordType") as string | null)?.trim() || undefined;
    const sourceOffice = (formData.get("sourceOffice") as string | null)?.trim() || undefined;
    const language = (formData.get("language") as string | null)?.trim() || undefined;
    const description = (formData.get("description") as string | null)?.trim() || undefined;
    const priority = (formData.get("priority") as string | null)?.trim() || undefined;

    if (!file) return apiError("No file provided");

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return apiError("Invalid file type. Allowed: PDF, JPG, JPEG, PNG");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
    }

    const user = store.users.find((u) => u.id === session.userId);
    const docId = generateId("DOC-");

  const { pageCount } = await saveUploadedFile(docId, file);

    const doc: Document = {
      id: docId,
      name: nameOverride || file.name,
      fileType: file.type,
      fileSize: file.size,
      pageCount,
      uploadedBy: session.userId,
      uploadedByName: user?.name || "Unknown",
      uploadedAt: new Date().toISOString(),
      status: "UPLOADED",
      steps: createInitialSteps().map((s, i) =>
        i === 0
          ? { ...s, status: "completed" as const, completedAt: new Date().toISOString() }
          : s
      ),
      pages: Array.from({ length: pageCount }, (_, i) => ({
        page: i + 1,
        imageUrl: fileUrl(docId, i + 1, true),
      })),
      district: district || user?.district,
      state,
      tehsil,
      village,
      recordYear,
      recordType,
      sourceOffice,
      language,
      description,
      priority,
    };

    store.addDocument(doc);

    store.addAuditEvent({
      id: generateId("AE"),
      documentId: docId,
      timestamp: new Date().toISOString(),
      actor: session.userId,
      actorName: user?.name || "Unknown",
      action: "DOCUMENT_UPLOADED",
      details: `${file.name} uploaded`,
    });

    return apiSuccess({ document: doc, message: "Document uploaded successfully" });
  } catch {
    return apiError("Upload failed", 500);
  }
}

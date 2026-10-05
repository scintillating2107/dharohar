import { requireUser } from "@/server/auth";
import { createDocument } from "@/server/documents-service";
import { scheduleJobRun } from "@/server/kick";
import { getDocument, listDocuments } from "@/server/repo";
import { fail, handle, ok, paginated, pagination } from "@/server/http";

export const maxDuration = 300;

export const GET = handle(async (request: Request) => {
  const user = await requireUser("documents");
  const url = new URL(request.url);
  const { page, pageSize, limit, offset } = pagination(url);
  const { items, total } = await listDocuments({
    status: url.searchParams.get("status"),
    search: url.searchParams.get("search")?.trim() || null,
    uploadedBy: url.searchParams.get("mine") === "true" ? user.id : null,
    limit,
    offset,
  });
  return paginated(items, total, page, pageSize);
});

function text(form: FormData, key: string, max = 200): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  return v.trim().slice(0, max) || null;
}

export const POST = handle(async (request: Request) => {
  const user = await requireUser("upload");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided");
  const autoProcess = text(form, "autoProcess") === "true";

  const { id, duplicateOf } = await createDocument({
    buffer: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    actor: { id: user.id, name: user.name, district: user.district },
    autoProcess,
    meta: {
      name: text(form, "name"),
      district: text(form, "district"),
      state: text(form, "state"),
      tehsil: text(form, "tehsil"),
      village: text(form, "village"),
      recordYear: text(form, "recordYear", 4),
      recordType: text(form, "recordType"),
      sourceOffice: text(form, "sourceOffice"),
      language: text(form, "language", 10),
      description: text(form, "description", 2000),
      priority: text(form, "priority", 10),
    },
  });
  if (autoProcess) scheduleJobRun();

  return ok({
    document: await getDocument(id),
    duplicateOf,
    message: duplicateOf ? `Uploaded. An identical file already exists as ${duplicateOf}.` : "Document uploaded",
  });
});

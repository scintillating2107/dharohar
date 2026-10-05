import { eq } from "drizzle-orm";
import { appendAudit } from "@/server/audit";
import { newId, sha256Hex } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";
import { getStorage, storageKeys } from "@/server/storage";
import { enqueueJob } from "@/server/jobs";
import { ServiceError, type Actor } from "@/server/records-service";
import { initialSteps } from "@/server/pipeline/run";
import { MAX_FILE_SIZE_BYTES, DOCUMENT_LANGUAGES } from "@/lib/config";

/** Identifies the real file type from its leading bytes (never trusts the declared MIME type). */
export function sniffFileType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: ".pdf" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: ".png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: ".jpg" };
  const tiff = buf.subarray(0, 4).toString("hex");
  if (tiff === "49492a00" || tiff === "4d4d002a") return { mime: "image/tiff", ext: ".tif" };
  return null;
}

export interface DocumentMetadata {
  name?: string | null;
  district?: string | null;
  state?: string | null;
  tehsil?: string | null;
  village?: string | null;
  recordYear?: string | null;
  recordType?: string | null;
  sourceOffice?: string | null;
  language?: string | null;
  description?: string | null;
  priority?: string | null;
}

/** Stores an upload in the repository and registers it; optionally queues processing. */
export async function createDocument(input: {
  buffer: Buffer;
  fileName: string;
  meta: DocumentMetadata;
  actor: Actor & { district?: string };
  autoProcess?: boolean;
}): Promise<{ id: string; duplicateOf: string | null }> {
  const { buffer, meta } = input;
  if (buffer.length === 0) throw new ServiceError("The file is empty");
  if (buffer.length > MAX_FILE_SIZE_BYTES) throw new ServiceError(`File exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`);
  const type = sniffFileType(buffer);
  if (!type) throw new ServiceError("Unsupported file. Upload a PDF, JPEG, PNG or TIFF scan.");
  const language = meta.language || "auto";
  if (!DOCUMENT_LANGUAGES.some((l) => l.code === language)) throw new ServiceError("Unsupported language");
  if (meta.recordYear && !/^(1[89]|20)\d{2}$/.test(meta.recordYear)) throw new ServiceError("Record year must be a 4-digit year");

  const id = newId("DOC");
  const sha256 = sha256Hex(buffer);
  const storageKey = storageKeys.original(id, type.ext);
  await getStorage().put(storageKey, buffer, type.mime);

  const db = await getDb();
  const [duplicate] = await db.select({ id: documents.id }).from(documents).where(eq(documents.sha256, sha256)).limit(1);
  const now = new Date().toISOString();
  await db.insert(documents).values({
    id,
    name: (meta.name || input.fileName).slice(0, 200),
    fileType: type.mime,
    fileSize: buffer.length,
    sha256,
    storageKey,
    pageCount: 0,
    uploadedBy: input.actor.id,
    uploadedByName: input.actor.name,
    uploadedAt: now,
    status: input.autoProcess ? "QUEUED" : "UPLOADED",
    steps: initialSteps(now),
    district: meta.district || input.actor.district || null,
    state: meta.state || null,
    tehsil: meta.tehsil || null,
    village: meta.village || null,
    recordYear: meta.recordYear || null,
    recordType: meta.recordType || null,
    sourceOffice: meta.sourceOffice || null,
    language,
    description: meta.description || null,
    priority: meta.priority === "urgent" ? "urgent" : "normal",
  });
  await appendAudit({
    action: "DOCUMENT_UPLOADED",
    actor: input.actor.id,
    actorName: input.actor.name,
    documentId: id,
    details: `${input.fileName} (${type.mime}, ${Math.max(1, Math.round(buffer.length / 1024))} KB, SHA-256 ${sha256.slice(0, 16)}…)${duplicate ? `; identical to ${duplicate.id}` : ""}`,
  });
  if (input.autoProcess) await enqueueJob("process_document", { documentId: id });
  return { id, duplicateOf: duplicate?.id ?? null };
}

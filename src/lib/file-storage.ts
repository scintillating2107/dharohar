import { mkdir, writeFile, readFile, access } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { extractTextFromPdfBuffer } from "./text-extraction";
import { renderPdfToPageImages, countRenderedPages } from "./pdf-renderer";
import { getUploadsRoot } from "./data-paths";

const UPLOAD_ROOT = getUploadsRoot();

function documentDir(documentId: string): string {
  return path.join(UPLOAD_ROOT, documentId);
}

function extensionFromMime(mime: string, fileName: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
  };
  if (map[mime]) return map[mime];
  return path.extname(fileName).toLowerCase() || ".bin";
}

export async function saveUploadedFile(
  documentId: string,
  file: File
): Promise<{ storagePath: string; pageCount: number }> {
  const dir = documentDir(documentId);
  await mkdir(dir, { recursive: true });

  const ext = extensionFromMime(file.type, file.name);
  const storagePath = path.join(dir, `original${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  let pageCount = 1;

  if (file.type === "application/pdf") {
    const pdfText = await extractTextFromPdfBuffer(buffer);
    await writeFile(path.join(dir, "extracted-text.txt"), pdfText.text || "", "utf-8");

    const rendered = await renderPdfToPageImages(documentId, buffer);
    pageCount = rendered.pageCount;
  } else if (file.type.startsWith("image/")) {
    await sharp(buffer)
      .rotate()
      .normalize()
      .sharpen()
      .png()
      .toFile(path.join(dir, "page-1.png"));
    pageCount = 1;
  }

  return { storagePath, pageCount };
}

export async function readStoredFile(documentId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  const dir = documentDir(documentId);
  for (const ext of [".pdf", ".jpg", ".jpeg", ".png"]) {
    const filePath = path.join(dir, `original${ext}`);
    try {
      await access(filePath);
      const buffer = await readFile(/* turbopackIgnore: true */ filePath);
      const mimeType =
        ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
      return { buffer, mimeType, fileName: path.basename(filePath) };
    } catch {
      continue;
    }
  }
  return null;
}

export async function readPageImageBuffer(documentId: string, page: number): Promise<Buffer | null> {
  const pagePath = path.join(documentDir(documentId), `page-${page}.png`);
  try {
    await access(pagePath);
    return readFile(/* turbopackIgnore: true */ pagePath);
  } catch {
    return null;
  }
}

export async function readExtractedText(documentId: string): Promise<string> {
  try {
    return await readFile(
      /* turbopackIgnore: true */ path.join(documentDir(documentId), "extracted-text.txt"),
      "utf-8"
    );
  } catch {
    return "";
  }
}

export async function ensurePageImages(documentId: string): Promise<number> {
  const stored = await readStoredFile(documentId);
  if (!stored) throw new Error("Uploaded file not found");

  if (stored.mimeType === "application/pdf") {
    const existing = await countRenderedPages(documentId);
    if (existing >= 1 && (await readPageImageBuffer(documentId, 1))) {
      return existing;
    }
    const rendered = await renderPdfToPageImages(documentId, stored.buffer);
    return rendered.pageCount;
  }

  const pagePath = path.join(documentDir(documentId), "page-1.png");
  try {
    await access(pagePath);
  } catch {
    await sharp(stored.buffer).rotate().normalize().sharpen().png().toFile(pagePath);
  }
  return 1;
}

export async function analyzeImageQuality(buffer: Buffer): Promise<{
  quality_score: number;
  blur_detected: boolean;
}> {
  const stats = await sharp(buffer).greyscale().stats();
  const stdev = stats.channels[0]?.stdev ?? 30;
  const quality_score = Math.round(Math.min(98, Math.max(45, stdev * 2.2)));
  const blur_detected = stdev < 22;
  return { quality_score, blur_detected };
}

export function fileUrl(documentId: string, page = 1, processed = true): string {
  const params = new URLSearchParams({ page: String(page) });
  if (processed) params.set("processed", "true");
  return `/api/documents/${documentId}/file?${params}`;
}

export async function getPageCount(documentId: string): Promise<number> {
  const rendered = await countRenderedPages(documentId);
  if (rendered > 0) return rendered;

  const stored = await readStoredFile(documentId);
  if (!stored) return 1;
  if (stored.mimeType === "application/pdf") {
    const pdfData = await extractTextFromPdfBuffer(stored.buffer);
    return pdfData.pageCount;
  }
  return 1;
}

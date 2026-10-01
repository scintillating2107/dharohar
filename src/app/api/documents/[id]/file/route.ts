import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store } from "@/lib/store";
import { readStoredFile } from "@/lib/file-storage";
import { readFile, access } from "fs/promises";
import path from "path";
import { unauthorized, notFound } from "@/lib/api-utils";
import { getUploadsRoot } from "@/lib/data-paths";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const { id } = await params;
  const doc = store.getDocument(id);
  if (!doc) return notFound("Document not found");

  const { searchParams } = new URL(request.url);
  const processed = searchParams.get("processed") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (processed) {
    const processedPath = path.join(getUploadsRoot(), id, `page-${page}.png`);
    try {
      await access(processedPath);
      const buffer = await readFile(/* turbopackIgnore: true */ processedPath);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="${doc.name}-page-${page}.png"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      // fall through to original
    }
  }

  const stored = await readStoredFile(id);
  if (!stored) return notFound("Uploaded file not found");

  return new Response(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": stored.mimeType,
      "Content-Disposition": `inline; filename="${doc.name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

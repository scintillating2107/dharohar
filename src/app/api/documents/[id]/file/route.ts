import { requireUser } from "@/server/auth";
import { getStorage } from "@/server/storage";
import { getDocumentRow, getPages } from "@/server/repo";
import { fail, handle } from "@/server/http";

/** Streams the original upload or a rendered / enhanced page image. */
export const GET = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser("documents");
  const { id } = await ctx.params;
  const doc = await getDocumentRow(id);
  if (!doc) return fail("Document not found", 404);
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant");
  const pageParam = url.searchParams.get("page");

  let key = doc.storageKey;
  let contentType = doc.fileType;
  let filename = doc.name;
  if (pageParam && variant !== "original") {
    const pageNum = parseInt(pageParam, 10);
    const page = (await getPages(id)).find((p) => p.page === pageNum);
    if (!page) return fail("Page not rendered yet", 404);
    key = variant === "enhanced" ? (page.enhancedKey ?? page.originalKey) : page.originalKey;
    contentType = "image/png";
    filename = `${doc.id}-page-${pageNum}${variant === "enhanced" ? "-enhanced" : ""}.png`;
  }
  const data = await getStorage().get(key);
  if (!data) return fail("File not found in repository", 404);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

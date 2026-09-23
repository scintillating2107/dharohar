import { writeFile, access, readFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

function documentDir(documentId: string): string {
  return path.join(UPLOAD_ROOT, documentId);
}

export async function renderPdfToPageImages(
  documentId: string,
  buffer: Buffer
): Promise<{ pageCount: number; paths: string[] }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const dir = documentDir(documentId);

  try {
    const textResult = await parser.getText();
    const pageCount = textResult.total || textResult.pages?.length || 1;

    const screenshots = await parser.getScreenshot({
      scale: 2,
      imageBuffer: true,
    });

    const paths: string[] = [];
    for (const shot of screenshots.pages) {
      const pagePath = path.join(dir, `page-${shot.pageNumber}.png`);
      await writeFile(pagePath, Buffer.from(shot.data));
      paths.push(pagePath);
    }

    if (paths.length === 0) {
      throw new Error("PDF rendering produced no page images");
    }

    return { pageCount: Math.max(pageCount, paths.length), paths };
  } finally {
    await parser.destroy();
  }
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

export async function pageImageExists(documentId: string, page: number): Promise<boolean> {
  try {
    await access(path.join(documentDir(documentId), `page-${page}.png`));
    return true;
  } catch {
    return false;
  }
}

export async function countRenderedPages(documentId: string): Promise<number> {
  let count = 0;
  for (let page = 1; page <= 50; page += 1) {
    if (await pageImageExists(documentId, page)) count += 1;
    else break;
  }
  return count || 1;
}

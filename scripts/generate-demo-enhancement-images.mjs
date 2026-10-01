/**
 * Builds public/demo land-record before/after JPEGs for the guided workflow.
 * Run: node scripts/generate-demo-enhancement-images.mjs
 */
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "demo");

async function baseRegisterBuffer() {
  const svgPath = path.join(ROOT, "public", "samples", "land-record-page-1.svg");
  try {
    const svg = await readFile(svgPath);
    return sharp(svg).resize(900, 1200, { fit: "inside" }).png().toBuffer();
  } catch {
    const fallback = `
    <svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="1200" fill="#f4f0e8"/>
      <rect x="40" y="40" width="820" height="1120" fill="none" stroke="#8b7355" stroke-width="2"/>
      <text x="80" y="100" font-family="Georgia, serif" font-size="28" fill="#2c2416">खसरा अभिलेख — Khasra Register</text>
      <text x="80" y="160" font-family="serif" font-size="20" fill="#333">ग्राम: चिनहट · तहसील: सदर · जिला: लखनऊ</text>
      <text x="80" y="240" font-family="serif" font-size="22" fill="#222">खाता नं. 124</text>
      <text x="80" y="290" font-family="serif" font-size="22" fill="#222">खसरा नं. 235/1</text>
      <text x="80" y="340" font-family="serif" font-size="22" fill="#222">नाम: राम सिंह</text>
      <text x="80" y="390" font-family="serif" font-size="22" fill="#222">क्षेत्रफल: 1.80 हे.</text>
      <line x1="80" y1="420" x2="820" y2="420" stroke="#ccc" stroke-width="1"/>
      <text x="80" y="480" font-family="serif" font-size="16" fill="#555">Handwritten marginal notes (faded scan)</text>
    </svg>`;
    return sharp(Buffer.from(fallback)).png().toBuffer();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const base = await baseRegisterBuffer();

  const afterPath = path.join(OUT_DIR, "land-record-after.jpg");
  await sharp(base)
    .rotate(0)
    .normalize()
    .sharpen()
    .modulate({ brightness: 1.05, saturation: 0.95 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(afterPath);

  const afterBuf = await readFile(afterPath);

  const beforePath = path.join(OUT_DIR, "land-record-before.jpg");
  await sharp(afterBuf)
    .rotate(4.5, { background: { r: 210, g: 205, b: 198 } })
    .blur(2.8)
    .modulate({ brightness: 0.62, saturation: 0.7 })
    .linear(0.85, -12)
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(beforePath);

  console.log("Wrote:", beforePath);
  console.log("Wrote:", afterPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

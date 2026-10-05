import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { analyzeQuality, enhancePage } from "@/server/pipeline/image";

async function textPage(): Promise<Buffer> {
  const lines = Array.from({ length: 18 }, (_, i) =>
    `<text x="60" y="${100 + i * 50}" font-family="serif" font-size="26" fill="#222">Khasra 235/1 Owner Ram Singh line ${i}</text>`
  ).join("");
  const svg = `<svg width="900" height="1100" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="1100" fill="#fff"/>${lines}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("image quality and enhancement", () => {
  it("estimates skew of a tilted page and enhancement removes it", async () => {
    const page = await textPage();
    const straight = await analyzeQuality(page);
    expect(Math.abs(straight.skewAngle)).toBeLessThanOrEqual(0.3);

    // sharp rotates clockwise for positive angles
    const tilted = await sharp(page).rotate(4, { background: "#ffffff" }).png().toBuffer();
    const q = await analyzeQuality(tilted);
    expect(Math.abs(Math.abs(q.skewAngle) - 4)).toBeLessThanOrEqual(0.5);

    const enhanced = await enhancePage(tilted, q);
    const after = await analyzeQuality(enhanced.png);
    expect(Math.abs(after.skewAngle)).toBeLessThanOrEqual(0.5);
  });

  it("detects blur", async () => {
    const page = await textPage();
    const blurred = await sharp(page).blur(4).png().toBuffer();
    const sharpQ = await analyzeQuality(page);
    const blurQ = await analyzeQuality(blurred);
    expect(blurQ.sharpness).toBeLessThan(sharpQ.sharpness);
    expect(blurQ.blurDetected).toBe(true);
    expect(sharpQ.blurDetected).toBe(false);
  });
});

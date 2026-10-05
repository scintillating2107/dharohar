import sharp, { type Sharp } from "sharp";
import type { PageQuality } from "@/types";

/** Longest edge for page images handed to OCR (keeps memory and OCR time bounded). */
const MAX_PAGE_EDGE = 3000;

export interface RenderedPage {
  page: number;
  png: Buffer;
  width: number;
  height: number;
}

/** Rasterizes a PDF (2× scale) or normalizes an image upload into PNG pages. */
export async function renderPages(buffer: Buffer, mimeType: string): Promise<RenderedPage[]> {
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const shots = await parser.getScreenshot({ scale: 2, imageBuffer: true });
      const pages: RenderedPage[] = [];
      for (const shot of shots.pages) {
        pages.push(await toPagePng(Buffer.from(shot.data), shot.pageNumber));
      }
      if (pages.length === 0) throw new Error("PDF has no renderable pages");
      return pages;
    } finally {
      await parser.destroy();
    }
  }

  // Multi-page TIFF support: render every frame
  const meta = await sharp(buffer, { pages: -1 }).metadata();
  const frames = mimeType === "image/tiff" ? meta.pages ?? 1 : 1;
  const pages: RenderedPage[] = [];
  for (let i = 0; i < frames; i += 1) {
    const frame = await sharp(buffer, { page: i }).rotate().png().toBuffer();
    pages.push(await toPagePng(frame, i + 1));
  }
  return pages;
}

async function toPagePng(input: Buffer, page: number): Promise<RenderedPage> {
  const img = sharp(input).flatten({ background: "#ffffff" });
  const meta = await img.metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const resized =
    longest > MAX_PAGE_EDGE
      ? img.resize({ width: meta.width! >= meta.height! ? MAX_PAGE_EDGE : undefined, height: meta.height! > meta.width! ? MAX_PAGE_EDGE : undefined })
      : img;
  const { data, info } = await resized.png().toBuffer({ resolveWithObject: true });
  return { page, png: data, width: info.width, height: info.height };
}

// ---------------------------------------------------------------------------
// Quality analysis
// ---------------------------------------------------------------------------

/** Runs a single-band pipeline to raw bytes (sharp otherwise re-expands b-w to 3 channels). */
async function rawGray(img: Sharp): Promise<Buffer> {
  return img.extractChannel(0).raw().toBuffer();
}

interface Gray {
  data: Uint8Array;
  width: number;
  height: number;
}

async function grayscale(buffer: Buffer, maxWidth: number): Promise<Gray> {
  const { data, info } = await sharp(buffer)
    .flatten({ background: "#ffffff" })
    .greyscale()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

function laplacianVariance(g: Gray): number {
  const { data, width, height } = g;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const v = data[i - width] + data[i + width] + data[i - 1] + data[i + 1] - 4 * data[i];
      sum += v;
      sumSq += v * v;
      n += 1;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function meanStd(g: Gray): { mean: number; std: number } {
  let sum = 0;
  let sumSq = 0;
  for (const v of g.data) {
    sum += v;
    sumSq += v * v;
  }
  const n = g.data.length || 1;
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sumSq / n - mean * mean)) };
}

function otsuThreshold(g: Gray): number {
  const hist = new Array(256).fill(0);
  for (const v of g.data) hist[v] += 1;
  const total = g.data.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i += 1) sumAll += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Projection-profile skew estimation: rotate the dark (ink) pixels by candidate angles and
 * pick the angle whose horizontal projection is most "peaky" (text lines aligned to rows).
 * Returns degrees; positive means the content is rotated counter-clockwise.
 */
export function estimateSkew(g: Gray, maxAngle = 10): number {
  const threshold = otsuThreshold(g);
  const xs: number[] = [];
  const ys: number[] = [];
  const { data, width, height } = g;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[y * width + x] < threshold) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  const inkRatio = xs.length / (width * height);
  if (xs.length < 200 || inkRatio > 0.5) return 0;

  // Subsample for speed
  const step = Math.max(1, Math.floor(xs.length / 60000));
  const cx = width / 2;
  const cy = height / 2;
  const diag = Math.ceil(Math.sqrt(width * width + height * height));

  const score = (deg: number): number => {
    const rad = (deg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const bins = new Float64Array(diag * 2);
    for (let i = 0; i < xs.length; i += step) {
      const yr = -(xs[i] - cx) * sin + (ys[i] - cy) * cos;
      bins[Math.round(yr) + diag] += 1;
    }
    let s = 0;
    for (const b of bins) s += b * b;
    return s;
  };

  let bestAngle = 0;
  let bestScore = score(0);
  for (let a = -maxAngle; a <= maxAngle; a += 0.5) {
    const s = score(a);
    if (s > bestScore) {
      bestScore = s;
      bestAngle = a;
    }
  }
  for (let a = bestAngle - 0.5; a <= bestAngle + 0.5; a += 0.1) {
    const s = score(a);
    if (s > bestScore) {
      bestScore = s;
      bestAngle = a;
    }
  }
  return Math.round(bestAngle * 10) / 10;
}

async function noiseLevel(buffer: Buffer, width: number): Promise<number> {
  const base = await grayscale(buffer, width);
  const data = await rawGray(
    sharp(Buffer.from(base.data), { raw: { width: base.width, height: base.height, channels: 1 } }).median(3)
  );
  let diff = 0;
  for (let i = 0; i < base.data.length; i += 1) diff += Math.abs(base.data[i] - data[i]);
  return diff / (base.data.length || 1);
}

const ANALYSIS_WIDTH = 1000;

function histogram(data: Uint8Array): Uint32Array {
  const hist = new Uint32Array(256);
  for (const v of data) hist[v] += 1;
  return hist;
}

function percentile(hist: Uint32Array, total: number, p: number): number {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < 256; i += 1) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

/**
 * Ink-to-background contrast: paper level (90th percentile) minus mean ink level (pixels darker
 * than the Otsu threshold). Unlike global standard deviation this is meaningful for sparse text.
 */
function inkContrast(g: Gray): number {
  const hist = histogram(g.data);
  const background = percentile(hist, g.data.length, 0.9);
  const threshold = otsuThreshold(g);
  let inkSum = 0;
  let inkCount = 0;
  for (let i = 0; i < threshold; i += 1) {
    inkSum += i * hist[i];
    inkCount += hist[i];
  }
  if (inkCount === 0) return 0;
  return Math.max(0, background - inkSum / inkCount);
}

/**
 * Page prepared for skew estimation: speckle removed and the background flattened, so aged
 * paper, stains, vignetting and the fill exposed by a tilted scan are not mistaken for ink.
 * A thin margin is blanked because flattening is unreliable at the page edge.
 */
async function skewInput(g: Gray): Promise<Gray> {
  const { width, height } = g;
  const despeckled = await rawGray(sharp(Buffer.from(g.data), { raw: { width, height, channels: 1 } }).median(3));
  const flat = await flattenBackground(despeckled, width, height);
  const margin = Math.round(Math.min(width, height) * 0.03);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < margin || y < margin || x >= width - margin || y >= height - margin) flat[y * width + x] = 255;
    }
  }
  return { data: new Uint8Array(flat.buffer, flat.byteOffset, flat.length), width, height };
}

export async function analyzeQuality(buffer: Buffer): Promise<PageQuality> {
  const g = await grayscale(buffer, ANALYSIS_WIDTH);
  const sharpness = laplacianVariance(g);
  const brightness = meanStd(g).mean;
  const contrast = inkContrast(g);
  const noise = await noiseLevel(buffer, ANALYSIS_WIDTH);
  const skewAngle = estimateSkew(await skewInput(g));

  // Component scores 0–1
  const sharpScore = Math.min(1, Math.log10(1 + sharpness) / Math.log10(1 + 1500));
  const contrastScore = Math.min(1, contrast / 160);
  const brightnessScore = 1 - Math.min(1, Math.abs(brightness - 230) / 150);
  const noiseScore = 1 - Math.min(1, Math.max(0, noise - 1.5) / 10);
  const skewScore = 1 - Math.min(1, Math.abs(skewAngle) / 6);
  const score = Math.round(
    100 * (0.3 * sharpScore + 0.3 * contrastScore + 0.1 * brightnessScore + 0.15 * noiseScore + 0.15 * skewScore)
  );

  return {
    score,
    sharpness: Math.round(sharpness),
    blurDetected: sharpness < 120,
    brightness: Math.round(brightness),
    contrast: Math.round(contrast * 10) / 10,
    noise: Math.round(noise * 100) / 100,
    skewAngle,
  };
}

// ---------------------------------------------------------------------------
// Enhancement
// ---------------------------------------------------------------------------

export interface EnhancementResult {
  png: Buffer;
  width: number;
  height: number;
  operations: string[];
}

/**
 * Flat-field background correction: divides the page by a heavily blurred copy of itself,
 * removing yellowing, stains and uneven illumination while keeping strokes intact.
 */
async function flattenBackground(gray: Buffer, width: number, height: number): Promise<Buffer> {
  const sigma = Math.max(8, Math.round(Math.min(width, height) / 60));
  const background = await rawGray(sharp(gray, { raw: { width, height, channels: 1 } }).blur(sigma));
  const out = Buffer.alloc(gray.length);
  for (let i = 0; i < gray.length; i += 1) {
    out[i] = Math.min(255, Math.round((gray[i] * 255) / Math.max(1, background[i])));
  }
  return out;
}

/** Stretches ink levels: maps [darkest 0.2% of pixels, 250] onto [0, 255]. */
function stretchInk(data: Buffer): Buffer {
  const hist = histogram(data);
  const low = Math.min(percentile(hist, data.length, 0.002), 200);
  const high = 250;
  const scale = 255 / Math.max(1, high - low);
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = Math.max(0, Math.min(255, Math.round((data[i] - low) * scale)));
  }
  return out;
}

/** Deskew → background flattening → denoise → ink stretch → sharpen, driven by measured quality. */
export async function enhancePage(buffer: Buffer, quality: PageQuality): Promise<EnhancementResult> {
  const operations: string[] = [];
  let img = sharp(buffer).flatten({ background: "#ffffff" }).greyscale();

  if (Math.abs(quality.skewAngle) >= 0.3) {
    // estimateSkew returns the angle that aligns the text rows; sharp rotates clockwise for
    // positive angles, so the correction is the negated estimate. Fill with the paper colour.
    const paper = Math.round(quality.brightness);
    img = sharp(await img.png().toBuffer()).rotate(-quality.skewAngle, {
      background: { r: paper, g: paper, b: paper },
    });
    operations.push(`deskew ${-quality.skewAngle > 0 ? "+" : ""}${-quality.skewAngle}°`);
  }

  const { data: gray, info } = await sharp(await img.png().toBuffer())
    .greyscale()
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error(`Expected a single-channel page, got ${info.channels}`);
  let pixels = await flattenBackground(gray, info.width, info.height);
  operations.push("background flattening");

  let next = sharp(pixels, { raw: { width: info.width, height: info.height, channels: 1 } });
  if (quality.noise > 2.5) {
    next = next.median(3);
    operations.push("denoise (median 3×3)");
  }
  pixels = stretchInk(await rawGray(next));
  operations.push("ink contrast stretch");

  let out = sharp(pixels, { raw: { width: info.width, height: info.height, channels: 1 } });
  if (quality.blurDetected) {
    out = out.sharpen({ sigma: 1.2, m1: 1, m2: 3 });
    operations.push("unsharp mask");
  }
  const { data, info: outInfo } = await out.png().toBuffer({ resolveWithObject: true });
  return { png: data, width: outInfo.width, height: outInfo.height, operations };
}

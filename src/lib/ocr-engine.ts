import { createWorker, type Worker, type Page } from "tesseract.js";

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface OcrPageResult {
  text: string;
  words: OcrWord[];
  language: string;
}

let workerInstance: Worker | null = null;
let workerInit: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (workerInstance) return workerInstance;
  if (!workerInit) {
    workerInit = (async () => {
      const worker = await createWorker("hin+eng", 1, {
        logger: () => {},
      });
      workerInstance = worker;
      return worker;
    })();
  }
  return workerInit;
}

function wordsFromPage(page: Page): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          const text = word.text.trim();
          if (!text) continue;
          words.push({
            text,
            confidence: Math.min(1, Math.max(0, word.confidence / 100)),
            bbox: [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1],
          });
        }
      }
    }
  }
  return words;
}

export async function recognizeImageBuffer(buffer: Buffer): Promise<OcrPageResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer, {}, { blocks: true, text: true });

  const words = wordsFromPage(data);
  const text = (data.text || "").trim();

  return {
    text,
    words,
    language: /[\u0900-\u097F]/.test(text) ? "hi" : "en",
  };
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
    workerInit = null;
  }
}

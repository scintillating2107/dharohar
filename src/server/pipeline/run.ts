import sharp from "sharp";
import { and, eq, gt, sql } from "drizzle-orm";
import type { DB } from "@/server/db/client";
import { getDb, queryRows } from "@/server/db/client";
import { documentPages, documents, ocrResults, records, verificationTasks } from "@/server/db/schema";
import { appendAudit } from "@/server/audit";
import { newId } from "@/server/crypto";
import { env, geminiEnabled } from "@/server/env";
import { getStorage, storageKeys } from "@/server/storage";
import { getSettings } from "@/server/settings";
import { notifyRoles } from "@/server/notifications";
import { PermanentJobError } from "@/server/jobs";
import { emitWebhookEvent } from "@/server/webhooks";
import { fewShotExamples, learnedRules, applyLearnedRules } from "@/server/learning";
import { resolveApproximateLocation, upsertApproximateParcel } from "@/server/gis";
import {
  approveRecord,
  buildRecordColumns,
  computeValidation,
  SYSTEM_ACTOR,
  writeVersion,
} from "@/server/records-service";
import { getDocumentRow, getOcr, getPages, getRecordByDocument, type DocumentRow } from "@/server/repo";
import { PROCESSING_STEPS } from "@/lib/config";
import type { OCRPageResult, ProcessingStatus, ProcessingStep, ProcessingStepKey, SystemSettings, ValidationResult } from "@/types";
import { renderPages, analyzeQuality, enhancePage } from "./image";
import { detectOrientationAndScript, tesseractOcr } from "./ocr";
import { transcribePage, geminiExtract, type GeminiExtraction } from "./gemini";
import { ruleExtract, combineExtraction } from "./extraction";
import { describeScriptMix, detectScripts } from "./normalize";
import type { PipelineState } from "./state";

const STEP_STATUS: Partial<Record<ProcessingStepKey, ProcessingStatus>> = {
  pdf_processing: "PROCESSING",
  image_enhancement: "IMAGE_PROCESSING",
  language_detection: "OCR_PROCESSING",
  ocr: "OCR_PROCESSING",
  field_extraction: "EXTRACTION_PROCESSING",
  validation: "VALIDATION_PROCESSING",
};

export function initialSteps(uploadedAt?: string): ProcessingStep[] {
  return PROCESSING_STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    status: s.key === "upload" ? ("completed" as const) : ("pending" as const),
    ...(s.key === "upload" ? { completedAt: uploadedAt ?? new Date().toISOString() } : {}),
  }));
}

class PipelineContext {
  steps: ProcessingStep[];
  state: PipelineState;

  constructor(
    public doc: DocumentRow,
    restart: boolean
  ) {
    this.steps = restart || !doc.steps?.length ? initialSteps(doc.uploadedAt) : doc.steps;
    this.state = restart ? { reprocessReason: doc.pipelineState?.reprocessReason } : doc.pipelineState ?? {};
    // A step left "in_progress" by a crashed worker is re-run
    this.steps = this.steps.map((s) => (s.status === "in_progress" || s.status === "failed" ? { ...s, status: "pending", error: undefined } : s));
  }

  async persist(extra: Partial<typeof documents.$inferInsert> = {}): Promise<void> {
    const db = await getDb();
    await db
      .update(documents)
      .set({ steps: this.steps, pipelineState: this.state, ...extra })
      .where(eq(documents.id, this.doc.id));
  }

  private patch(key: ProcessingStepKey, patch: Partial<ProcessingStep>): void {
    this.steps = this.steps.map((s) => (s.key === key ? { ...s, ...patch } : s));
  }

  async run(key: ProcessingStepKey, fn: () => Promise<string | undefined>): Promise<void> {
    const step = this.steps.find((s) => s.key === key);
    if (!step || step.status === "completed") return;
    const startedAt = new Date().toISOString();
    this.patch(key, { status: "in_progress", startedAt, error: undefined });
    await this.persist({ status: STEP_STATUS[key] ?? "PROCESSING", error: null });
    const t0 = Date.now();
    try {
      const detail = await fn();
      this.patch(key, {
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - t0,
        detail,
      });
      await this.persist();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.patch(key, { status: "failed", error: message, durationMs: Date.now() - t0 });
      await this.persist({ status: "FAILED", error: `${step.label}: ${message}` });
      await appendAudit({
        action: "PROCESSING_FAILED",
        actor: SYSTEM_ACTOR.id,
        actorName: SYSTEM_ACTOR.name,
        documentId: this.doc.id,
        details: `${step.label}: ${message}`,
      });
      throw err;
    }
  }
}

/**
 * Runs (or resumes) the digitization pipeline for a document:
 * render → enhance → detect language/orientation → OCR → extract → validate → queue for verification.
 */
export async function processDocument(documentId: string, opts: { restart?: boolean } = {}): Promise<void> {
  const doc = await getDocumentRow(documentId);
  if (!doc) return;
  if (doc.status === "VERIFIED" || doc.status === "REJECTED") return;

  const settings = await getSettings();
  const ctx = new PipelineContext(doc, Boolean(opts.restart));
  await ctx.persist({ status: "PROCESSING", error: null });
  await appendAudit({
    action: "PROCESSING_STARTED",
    actor: SYSTEM_ACTOR.id,
    actorName: SYSTEM_ACTOR.name,
    documentId,
    details: opts.restart ? `Reprocessing: ${ctx.state.reprocessReason ?? "requested"}` : undefined,
  });

  await ctx.run("pdf_processing", () => stepRender(doc));
  await ctx.run("image_enhancement", () => stepEnhance(doc));
  await ctx.run("language_detection", () => stepLanguage(doc, ctx.state));
  await ctx.run("ocr", () => stepOcr(doc, ctx.state));
  await ctx.run("field_extraction", () => stepExtract(doc, ctx.state, settings));

  let outcome: { recordId: string; validation: ValidationResult; avgConfidence: number } | null = null;
  await ctx.run("validation", async () => {
    outcome = await stepValidateAndStore(ctx, settings);
    return `${outcome.validation.validation_status} · score ${outcome.validation.validation_score} · ${outcome.validation.warnings.length} warning(s)`;
  });
  if (!outcome) return;
  const { recordId, validation, avgConfidence } = outcome as { recordId: string; validation: ValidationResult; avgConfidence: number };

  const fresh = (await getDocumentRow(documentId))!;
  await notifyRoles(
    ["VERIFICATION_OFFICER"],
    {
      title: `Record ${recordId} awaiting verification`,
      body: `${fresh.name} · validation ${validation.validation_status} · confidence ${Math.round(avgConfidence * 100)}%`,
      link: `/verification/${recordId}`,
    },
    fresh.district ?? undefined
  );
  await emitWebhookEvent("record.extracted", { record_id: recordId, document_id: documentId, validation_status: validation.validation_status });

  if (
    settings.autoApproveEnabled &&
    validation.validation_status === "VALID" &&
    avgConfidence >= settings.autoApproveThreshold
  ) {
    await approveRecord(recordId, {}, SYSTEM_ACTOR, { auto: true });
  }
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function stepRender(doc: DocumentRow): Promise<string> {
  const storage = getStorage();
  const original = await storage.get(doc.storageKey);
  if (!original) throw new PermanentJobError("Uploaded file is missing from the repository");
  const pages = await renderPages(original, doc.fileType);
  const db = await getDb();
  for (const p of pages) {
    const key = storageKeys.page(doc.id, p.page);
    await storage.put(key, p.png, "image/png");
    await db
      .insert(documentPages)
      .values({ documentId: doc.id, page: p.page, width: p.width, height: p.height, originalKey: key })
      .onConflictDoUpdate({
        target: [documentPages.documentId, documentPages.page],
        set: { width: p.width, height: p.height, originalKey: key, enhancedKey: null, qualityBefore: null, qualityAfter: null, enhancedBy: null, language: null },
      });
  }
  await db.delete(documentPages).where(and(eq(documentPages.documentId, doc.id), gt(documentPages.page, pages.length)));
  await db.update(documents).set({ pageCount: pages.length }).where(eq(documents.id, doc.id));
  return `${pages.length} page(s) rendered (${pages[0].width}×${pages[0].height}px)`;
}

async function enhanceWithMlService(doc: DocumentRow, pageCount: number): Promise<Map<number, Buffer> | null> {
  const storage = getStorage();
  if (!env.mlServiceUrl || !storage.localPath("x")) return null;
  const originals = new Map<number, Buffer>();
  for (let p = 1; p <= pageCount; p += 1) {
    const buf = await storage.get(storageKeys.page(doc.id, p));
    if (buf) originals.set(p, buf);
  }
  try {
    const res = await fetch(`${env.mlServiceUrl}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Integration-Key": env.integrationKey },
      body: JSON.stringify({ document_id: doc.id, page_count: pageCount }),
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    if (!res.ok) throw new Error(`ML service responded ${res.status}`);
    const enhanced = new Map<number, Buffer>();
    for (const p of originals.keys()) {
      const out = await storage.get(storageKeys.page(doc.id, p));
      if (out) enhanced.set(p, out);
    }
    return enhanced;
  } catch (err) {
    console.warn("[pipeline] ML enhancement service unavailable, using local enhancement:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    // The ML service writes in place; restore the untouched originals
    for (const [p, buf] of originals) await storage.put(storageKeys.page(doc.id, p), buf, "image/png");
  }
}

async function stepEnhance(doc: DocumentRow): Promise<string> {
  const storage = getStorage();
  const db = await getDb();
  const pages = await getPages(doc.id);
  if (!pages.length) throw new Error("No rendered pages found");
  const ml = await enhanceWithMlService(doc, pages.length);
  const ops = new Set<string>();
  let before = 0;
  let after = 0;

  for (const p of pages) {
    const original = await storage.get(p.originalKey);
    if (!original) throw new Error(`Page ${p.page} image missing`);
    const qBefore = await analyzeQuality(original);
    let png: Buffer;
    let by: string;
    const mlOut = ml?.get(p.page);
    if (mlOut) {
      png = mlOut;
      by = "Member 2 ML service (RealESRGAN)";
      ops.add("RealESRGAN super-resolution");
    } else {
      const result = await enhancePage(original, qBefore);
      png = result.png;
      by = `local: ${result.operations.join(", ")}`;
      result.operations.forEach((o) => ops.add(o.replace(/[+-]?\d+(\.\d+)?°/, "").trim()));
    }
    let qAfter = await analyzeQuality(png);
    let enhancedKey = storageKeys.enhanced(doc.id, p.page);
    if (qAfter.score + 3 < qBefore.score && Math.abs(qBefore.skewAngle) < 0.3) {
      // Enhancement made this page worse: OCR the original instead
      enhancedKey = p.originalKey;
      qAfter = qBefore;
      by = "original kept (enhancement did not improve quality)";
    } else {
      await storage.put(enhancedKey, png, "image/png");
    }
    const meta = await sharp(enhancedKey === p.originalKey ? original : png).metadata();
    await db
      .update(documentPages)
      .set({ enhancedKey, qualityBefore: qBefore, qualityAfter: qAfter, enhancedBy: by, width: meta.width, height: meta.height })
      .where(and(eq(documentPages.documentId, doc.id), eq(documentPages.page, p.page)));
    before += qBefore.score;
    after += qAfter.score;
  }
  const n = pages.length;
  return `Quality ${Math.round(before / n)} → ${Math.round(after / n)} · ${[...ops].join(", ")}`;
}

async function stepLanguage(doc: DocumentRow, state: PipelineState): Promise<string> {
  const storage = getStorage();
  const db = await getDb();
  const pages = await getPages(doc.id);
  const results: NonNullable<PipelineState["language"]>["pages"] = [];
  const votes = new Map<string, number>();

  for (const p of pages) {
    const key = p.enhancedKey ?? p.originalKey;
    let png = await storage.get(key);
    if (!png) throw new Error(`Page ${p.page} image missing`);
    const osd = await detectOrientationAndScript(png);
    let rotated = 0;
    if ([90, 180, 270].includes(osd.orientation) && osd.orientationConfidence >= 2) {
      png = await sharp(png).rotate(osd.orientation).png().toBuffer();
      const meta = await sharp(png).metadata();
      const target = storageKeys.enhanced(doc.id, p.page);
      await storage.put(target, png, "image/png");
      await db
        .update(documentPages)
        .set({ enhancedKey: target, width: meta.width, height: meta.height })
        .where(and(eq(documentPages.documentId, doc.id), eq(documentPages.page, p.page)));
      rotated = osd.orientation;
    }
    if (osd.language && osd.scriptConfidence >= 1) votes.set(osd.language, (votes.get(osd.language) ?? 0) + osd.scriptConfidence);
    await db
      .update(documentPages)
      .set({ language: osd.language })
      .where(and(eq(documentPages.documentId, doc.id), eq(documentPages.page, p.page)));
    results.push({ page: p.page, script: osd.script, confidence: Math.round(osd.scriptConfidence * 100) / 100, rotated });
  }

  const declared = doc.language && doc.language !== "auto" ? doc.language : null;
  const detected = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  // Latin-only OSD on Indian records usually means printed English labels; keep Hindi models too
  const code = declared ?? (detected && detected !== "en" ? detected : detected === "en" ? "hi" : "hi");
  const source: NonNullable<PipelineState["language"]>["source"] = declared ? "declared" : detected ? "osd" : "default";
  state.language = { code, source, pages: results };
  await db.update(documents).set({ detectedLanguage: code }).where(eq(documents.id, doc.id));

  const rotatedPages = results.filter((r) => r.rotated);
  // Only report scripts OSD was confident about; the OCR step reports the measured script mix
  const scripts =
    [...new Set(results.filter((r) => r.script && r.confidence >= 1).map((r) => r.script))].join(", ") ||
    "not determined by OSD (Hindi + English models used)";
  return `Language ${code} (${source}); script ${scripts}${rotatedPages.length ? `; rotated ${rotatedPages.map((r) => `p${r.page} ${r.rotated}°`).join(", ")}` : ""}`;
}

async function stepOcr(doc: DocumentRow, state: PipelineState): Promise<string> {
  const storage = getStorage();
  const db = await getDb();
  const pages = await getPages(doc.id);
  const language = state.language?.code ?? "hi";
  const useGemini = geminiEnabled();
  const out: OCRPageResult[] = [];
  let geminiError: string | undefined;
  let handwritten = false;
  let geminiLanguage: string | undefined;

  for (const p of pages) {
    const png = await storage.get(p.enhancedKey ?? p.originalKey);
    if (!png) throw new Error(`Page ${p.page} image missing`);
    const size = { width: p.width ?? 0, height: p.height ?? 0 };
    const page = await tesseractOcr(png, p.page, language, size);
    if (useGemini && !geminiError) {
      try {
        const t = await transcribePage(png);
        if (t.text.trim()) {
          page.text = t.text.trim();
          page.engine = `${page.engine}+gemini:${env.geminiModel}`;
          const scripts = detectScripts(t.text);
          page.language = scripts.primary === "unknown" ? t.language : scripts.mixed ? `${scripts.primary}+en` : scripts.primary;
          geminiLanguage ??= t.language;
          handwritten ||= t.handwritten;
        }
      } catch (err) {
        geminiError = err instanceof Error ? err.message : String(err);
        console.warn("[pipeline] Gemini transcription failed, using Tesseract text:", geminiError);
      }
    }
    out.push(page);
  }

  const engine = [...new Set(out.map((p) => p.engine))].join(", ");
  await db
    .insert(ocrResults)
    .values({ documentId: doc.id, engine, pages: out })
    .onConflictDoUpdate({ target: ocrResults.documentId, set: { engine, pages: out, createdAt: new Date().toISOString() } });

  const docLanguage =
    state.language?.source === "declared" ? language : geminiLanguage ?? out[0]?.language?.split("+")[0] ?? language;
  if (state.language && state.language.source !== "declared" && geminiLanguage) {
    state.language = { ...state.language, code: geminiLanguage, source: "gemini" };
  }
  state.ocr = { engine, ...(geminiError ? { geminiError } : {}), handwritten };
  await db.update(documents).set({ ocrEngine: engine, detectedLanguage: docLanguage }).where(eq(documents.id, doc.id));

  const words = out.reduce((s, p) => s + p.regions.length, 0);
  const meanConf = out.length ? out.reduce((s, p) => s + (p.meanConfidence ?? 0), 0) / out.length : 0;
  await appendAudit({
    action: "OCR_COMPLETED",
    actor: SYSTEM_ACTOR.id,
    actorName: SYSTEM_ACTOR.name,
    documentId: doc.id,
    details: `${out.length} page(s), ${words} words, mean word confidence ${(meanConf * 100).toFixed(1)}% (${engine})`,
  });
  const mix = describeScriptMix(out.map((p) => p.text).join("\n"));
  return `${words} words · mean confidence ${(meanConf * 100).toFixed(1)}%${mix ? ` · ${mix}` : ""} · ${engine}${handwritten ? " · handwriting detected" : ""}${geminiError ? " · Gemini unavailable" : ""}`;
}

async function stepExtract(doc: DocumentRow, state: PipelineState, settings: SystemSettings): Promise<string> {
  const ocr = await getOcr(doc.id);
  if (!ocr?.pages.length) throw new Error("OCR output not found");
  const text = ocr.pages.map((p) => p.text).join("\n\n");
  const rules = ruleExtract(text);

  let gemini: GeminiExtraction | null = null;
  let geminiError: string | undefined;
  if (geminiEnabled()) {
    try {
      const storage = getStorage();
      const pages = await getPages(doc.id);
      const images: { page: number; png: Buffer }[] = [];
      for (const p of pages.slice(0, 6)) {
        const png = await storage.get(p.enhancedKey ?? p.originalKey);
        if (png) images.push({ page: p.page, png });
      }
      const examples = settings.learningEnabled
        ? await fewShotExamples({ district: doc.district, recordType: doc.recordType })
        : [];
      gemini = await geminiExtract({
        ocrText: text,
        pages: images,
        hints: { district: doc.district, state: doc.state, recordType: doc.recordType },
        examples,
      });
    } catch (err) {
      geminiError = err instanceof Error ? err.message : String(err);
      console.warn("[pipeline] Gemini extraction failed, using rule-based extraction:", geminiError);
    }
  }

  const combined = combineExtraction({
    pages: ocr.pages,
    gemini,
    rules,
    metadata: { district: doc.district, state: doc.state, tehsil: doc.tehsil, village: doc.village },
    reviewThreshold: settings.reviewThreshold,
  });
  let fields = combined.fields;
  let learnedApplied: string[] = [];
  if (settings.learningEnabled) {
    const applied = applyLearnedRules(fields, await learnedRules());
    fields = applied.fields;
    learnedApplied = applied.applied;
  }
  const fromDocument = Object.values(fields).filter((f) => f.source !== "metadata").length;
  if (fromDocument === 0) {
    throw new PermanentJobError("No land-record fields could be identified in the document text");
  }
  const engine = gemini ? `gemini:${env.geminiModel} + rules` : "rules";
  state.extraction = {
    engine,
    fields,
    owners: combined.owners,
    learnedApplied,
    ...(geminiError ? { geminiError } : {}),
  };

  await appendAudit({
    action: "EXTRACTION_COMPLETED",
    actor: SYSTEM_ACTOR.id,
    actorName: SYSTEM_ACTOR.name,
    documentId: doc.id,
    details: `${fromDocument} field(s) from document via ${engine}${learnedApplied.length ? `; learned corrections applied to ${learnedApplied.join(", ")}` : ""}`,
  });
  const located = Object.values(fields).filter((f) => f.location).length;
  return `${fromDocument} fields (${located} located on page) · ${engine}${learnedApplied.length ? ` · ${learnedApplied.length} learned correction(s)` : ""}${geminiError ? " · Gemini unavailable" : ""}`;
}

const RECORD_ID_LOCK = 724002;

async function allocateRecordId(tx: DB): Promise<string> {
  await tx.execute(sql`select pg_advisory_xact_lock(${RECORD_ID_LOCK})`);
  const year = new Date().getFullYear();
  const prefix = `LR-${year}-`;
  const [{ n: last }] = await queryRows<{ n: number }>(
    tx,
    sql`select coalesce(max(split_part(id, '-', 3)::int), 0)::int as n from records where id like ${prefix + "%"}`
  );
  const n = last + 1;
  return `${prefix}${String(n).padStart(6, "0")}`;
}

function taskPriority(validation: ValidationResult, avg: number, settings: SystemSettings, doc: DocumentRow) {
  if (doc.priority === "urgent" || validation.validation_status === "INVALID") return "URGENT";
  if (avg < settings.highPriorityThreshold || validation.duplicate.detected) return "HIGH";
  if (validation.validation_status === "REVIEW_REQUIRED") return "MEDIUM";
  return "LOW";
}

async function stepValidateAndStore(
  ctx: PipelineContext,
  settings: SystemSettings
): Promise<{ recordId: string; validation: ValidationResult; avgConfidence: number }> {
  const doc = (await getDocumentRow(ctx.doc.id))!;
  const extraction = ctx.state.extraction;
  if (!extraction) throw new Error("Extraction output missing");

  const { validation, canonical } = await computeValidation({
    documentId: doc.id,
    fields: extraction.fields,
    owners: extraction.owners,
    doc,
    settings,
  });
  const columns = buildRecordColumns(extraction.fields, extraction.owners, canonical, doc);
  const location = await resolveApproximateLocation(
    { village: columns.village, district: columns.district, state: columns.state },
    canonical
  );
  const existing = await getRecordByDocument(doc.id);
  const db = await getDb();
  const now = new Date().toISOString();
  let recordId = existing?.id ?? "";

  // Mark the step result before the record write so the in-transaction document update keeps it
  await db.transaction(async (t) => {
    const tx = t as unknown as DB;
    let row;
    if (existing) {
      [row] = await tx
        .update(records)
        .set({
          ...columns,
          fields: extraction.fields,
          validation,
          status: "VERIFICATION_REQUIRED",
          version: existing.version + 1,
          certificate: null,
          verifiedAt: null,
          verifiedBy: null,
          updatedAt: now,
        })
        .where(eq(records.id, existing.id))
        .returning();
    } else {
      recordId = await allocateRecordId(tx);
      [row] = await tx
        .insert(records)
        .values({
          id: recordId,
          documentId: doc.id,
          version: 1,
          status: "VERIFICATION_REQUIRED",
          ...columns,
          fields: extraction.fields,
          validation,
        })
        .returning();
    }
    await writeVersion(
      tx,
      row,
      existing ? `AI re-extraction${ctx.state.reprocessReason ? ` (${ctx.state.reprocessReason})` : ""}` : "AI extraction",
      SYSTEM_ACTOR
    );

    const priority = taskPriority(validation, columns.averageConfidence, settings, doc);
    await tx
      .insert(verificationTasks)
      .values({
        id: newId("VT"),
        recordId: row.id,
        documentId: doc.id,
        status: "PENDING",
        priority,
        confidence: columns.averageConfidence,
        validationStatus: validation.validation_status,
      })
      .onConflictDoUpdate({
        target: verificationTasks.recordId,
        set: {
          status: "PENDING",
          priority,
          confidence: columns.averageConfidence,
          validationStatus: validation.validation_status,
          lastEditedBy: null,
          updatedAt: now,
        },
      });

    await upsertApproximateParcel(tx, row.id, location);

    await tx
      .update(documents)
      .set({
        recordId: row.id,
        status: "VERIFICATION_REQUIRED",
        district: doc.district ?? (columns.district || null),
        state: doc.state ?? (columns.state || null),
        steps: ctx.steps.map((s) =>
          s.key === "validation"
            ? { ...s, status: "completed" as const, completedAt: now }
            : s.key === "human_verification"
              ? { ...s, status: "in_progress" as const, startedAt: now }
              : s
        ),
      })
      .where(eq(documents.id, doc.id));

    await appendAudit(
      {
        action: "VALIDATION_COMPLETED",
        actor: SYSTEM_ACTOR.id,
        actorName: SYSTEM_ACTOR.name,
        documentId: doc.id,
        recordId: row.id,
        details: `Score ${validation.validation_score}, ${validation.validation_status}; ${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`,
      },
      tx
    );
  });

  // Keep the in-memory step list in sync with what the transaction wrote
  ctx.steps = ctx.steps.map((s) =>
    s.key === "human_verification" ? { ...s, status: "in_progress" as const, startedAt: now } : s
  );
  return { recordId, validation, avgConfidence: columns.averageConfidence };
}

export async function resetFailedDocument(documentId: string): Promise<void> {
  const db = await getDb();
  await db.update(documents).set({ status: "QUEUED", error: null }).where(eq(documents.id, documentId));
}

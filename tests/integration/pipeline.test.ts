import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "path";
import os from "os";
import { mkdtempSync, rmSync } from "fs";
import sharp from "sharp";

/**
 * Full pipeline against an embedded Postgres and local storage in a temp directory, using real
 * Tesseract OCR (Gemini disabled so the run is deterministic and offline after first model download).
 */

const tmp = mkdtempSync(path.join(os.tmpdir(), "dharohar-it-"));
process.env.PGLITE_DIR = path.join(tmp, "pg");
process.env.STORAGE_DIR = path.join(tmp, "storage");
process.env.OCR_ENGINE = "tesseract";
process.env.TESSERACT_CACHE_DIR = path.join(process.cwd(), "data", "tesseract-cache");
process.env.SEED_DEMO_USERS = "true";
process.env.GEOCODER = "none";

async function khatauniScan(): Promise<Buffer> {
  const lines = [
    ["Khatauni - Record of Rights", 30],
    ["District: Lucknow    Tehsil: Sadar", 26],
    ["Village: Chinhat", 26],
    ["Khata No: 124", 26],
    ["Owner: Ram Singh", 26],
    ["Father: Mohan Singh", 26],
    ["Khasra No: 235/1", 26],
    ["Area: 0.2450 hectare", 26],
    ["Land Type: Agricultural", 26],
    ["Mutation No: M-2024-123", 26],
  ] as const;
  const text = lines
    .map(([t, size], i) => `<text x="80" y="${140 + i * 70}" font-family="Arial, sans-serif" font-size="${size}" fill="#1a1a1a">${t}</text>`)
    .join("");
  const svg = `<svg width="1240" height="1754" xmlns="http://www.w3.org/2000/svg"><rect width="1240" height="1754" fill="#f4efe4"/>${text}</svg>`;
  // Simulate a slightly skewed, noisy scan
  return sharp(Buffer.from(svg)).rotate(2.5, { background: "#f4efe4" }).blur(0.6).jpeg({ quality: 80 }).toBuffer();
}

type Server = {
  db: typeof import("@/server/db/client");
  docs: typeof import("@/server/documents-service");
  run: typeof import("@/server/pipeline/run");
  records: typeof import("@/server/records-service");
  repo: typeof import("@/server/repo");
  audit: typeof import("@/server/audit");
  cert: typeof import("@/server/certification");
  schema: typeof import("@/server/db/schema");
  learning: typeof import("@/server/learning");
};
let s: Server;
const officer = { id: "U002", name: "Rajesh Kumar" };
const dataOfficer = { id: "U003", name: "Priya Sharma", district: "Lucknow" };

beforeAll(async () => {
  s = {
    db: await import("@/server/db/client"),
    docs: await import("@/server/documents-service"),
    run: await import("@/server/pipeline/run"),
    records: await import("@/server/records-service"),
    repo: await import("@/server/repo"),
    audit: await import("@/server/audit"),
    cert: await import("@/server/certification"),
    schema: await import("@/server/db/schema"),
    learning: await import("@/server/learning"),
  };
  await s.db.getDb();
}, 120_000);

afterAll(async () => {
  const { terminateOcrWorkers } = await import("@/server/pipeline/ocr");
  await terminateOcrWorkers();
  await s.db.closeDb();
  rmSync(tmp, { recursive: true, force: true });
});

describe("digitization pipeline", () => {
  let recordId = "";
  let documentId = "";

  it("rejects files that are not scans", async () => {
    await expect(
      s.docs.createDocument({ buffer: Buffer.from("hello"), fileName: "x.pdf", meta: {}, actor: dataOfficer })
    ).rejects.toThrow(/Unsupported file/);
  });

  it("processes an uploaded scan into a validated record awaiting verification", async () => {
    const created = await s.docs.createDocument({
      buffer: await khatauniScan(),
      fileName: "khatauni-chinhat.jpg",
      meta: { district: "Lucknow", state: "Uttar Pradesh", recordType: "Khatauni / Record of Rights", recordYear: "2024", language: "en" },
      actor: dataOfficer,
    });
    documentId = created.id;
    await s.run.processDocument(documentId);

    const doc = await s.repo.getDocument(documentId);
    expect(doc?.status).toBe("VERIFICATION_REQUIRED");
    expect(doc?.steps.filter((st) => st.status === "completed").map((st) => st.key)).toEqual([
      "upload",
      "pdf_processing",
      "image_enhancement",
      "language_detection",
      "ocr",
      "field_extraction",
      "validation",
    ]);
    const page = doc!.pages[0];
    expect(Math.abs(page.qualityBefore!.skewAngle)).toBeGreaterThan(1.5);
    expect(page.processedImageUrl).toContain("variant=enhanced");

    const row = await s.repo.getRecordByDocument(documentId);
    expect(row).toBeTruthy();
    recordId = row!.id;
    expect(recordId).toMatch(/^LR-\d{4}-000001$/);
    expect(row!.khasraNormalized).toBe("235/1");
    expect(row!.khataNumber).toBe("124");
    expect(row!.ownerName).toMatch(/Ram Singh/i);
    expect(row!.district).toBe("Lucknow");
    expect(row!.village).toBe("Chinhat");
    expect(row!.areaHectares).toBeCloseTo(0.245, 3);
    expect(row!.fields.khasra_number.location?.bbox.length).toBe(4);
    expect(row!.validation?.errors).toEqual([]);

    const parcel = await s.repo.getParcelForRecord(recordId);
    expect(parcel?.geometry_source).toBe("approximate");
    expect(parcel?.center?.lat).toBeCloseTo(26.88, 1);

    const task = await s.repo.getTaskForRecord(recordId);
    expect(task?.status).toBe("PENDING");
  }, 600_000);

  it("saves officer edits, approves with a signed certificate and records corrections", async () => {
    await s.records.saveDraft(recordId, { fields: { owner_name: "Ram Singh Yadav" } }, officer);
    const approved = await s.records.approveRecord(recordId, { comment: "Checked against register" }, officer);
    expect(approved.status).toBe("VERIFIED");
    expect(approved.certificate?.algorithm).toBe("Ed25519");

    const row = (await s.repo.getRecordRow(recordId))!;
    const doc = await s.repo.getDocumentRow(row.documentId);
    const verification = await s.cert.verifyCertificate(row, doc);
    expect(verification.checks.filter((c) => !c.ok)).toEqual([]);
    expect(verification.valid).toBe(true);

    const corrections = await s.learning.correctionsForRecord(recordId);
    const owner = corrections.find((c) => c.field === "owner_name");
    expect(owner).toMatchObject({ accepted: false, humanValue: "Ram Singh Yadav" });
    expect(corrections.filter((c) => c.accepted).length).toBeGreaterThan(3);

    const chain = await s.audit.verifyAuditChain();
    expect(chain.valid).toBe(true);
    expect(chain.checked).toBeGreaterThan(8);
  });

  it("detects tampering with a certified record", async () => {
    const db = await s.db.getDb();
    const { eq } = await import("drizzle-orm");
    await db.update(s.schema.records).set({ area: 9.99 }).where(eq(s.schema.records.id, recordId));
    const row = (await s.repo.getRecordRow(recordId))!;
    const verification = await s.cert.verifyCertificate(row, await s.repo.getDocumentRow(row.documentId));
    expect(verification.valid).toBe(false);
    expect(verification.checks.find((c) => c.name.startsWith("Record unchanged"))?.ok).toBe(false);
    await db.update(s.schema.records).set({ area: row.area === 9.99 ? 0.245 : row.area }).where(eq(s.schema.records.id, recordId));
  });

  it("flags a second upload of the same plot as a duplicate and reprocesses it in place when sent back", async () => {
    const created = await s.docs.createDocument({
      buffer: await khatauniScan(),
      fileName: "khatauni-copy.jpg",
      meta: { district: "Lucknow", state: "Uttar Pradesh", language: "en" },
      actor: dataOfficer,
    });
    expect(created.duplicateOf).toBe(documentId);
    await s.run.processDocument(created.id);
    const second = (await s.repo.getRecordByDocument(created.id))!;
    const types = second.validation!.warnings.map((w) => w.type);
    expect(types).toContain("DUPLICATE_DOCUMENT");
    expect(types).toContain("DUPLICATE_CANDIDATE");
    expect(second.validation!.duplicate.record_id).toBe(recordId);

    await s.records.sendBackRecord(second.id, "Re-scan quality check", officer);
    await s.run.processDocument(created.id, { restart: true });
    const after = (await s.repo.getRecordByDocument(created.id))!;
    expect(after.id).toBe(second.id);
    expect(after.version).toBe(second.version + 1);
    const versions = await s.repo.getRecordVersions(second.id);
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
  }, 600_000);
});

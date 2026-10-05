import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "crypto";
import { eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditLog, settings } from "@/server/db/schema";
import { env } from "@/server/env";
import { canonicalJson, sha256Hex } from "@/server/crypto";
import { verifyAuditChain } from "@/server/audit";
import { getStorage } from "@/server/storage";
import type { Certificate } from "@/types";
import type { DocumentRow, RecordRow } from "@/server/repo";
import { HttpError } from "@/server/auth";

interface KeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
  source: "env" | "database";
}

let keyPromise: Promise<KeyPair> | null = null;

function keyIdOf(publicKey: KeyObject): string {
  return sha256Hex(publicKey.export({ type: "spki", format: "der" })).slice(0, 16);
}

function parsePem(value: string): string {
  return value.includes("BEGIN") ? value : Buffer.from(value, "base64").toString("utf8");
}

async function loadKeys(): Promise<KeyPair> {
  if (env.certSigningKey) {
    const privateKey = createPrivateKey(parsePem(env.certSigningKey));
    const publicKey = createPublicKey(privateKey);
    return { privateKey, publicKey, keyId: keyIdOf(publicKey), source: "env" };
  }
  if (env.isProd && process.env.DHAROHAR_ALLOW_DEV_SECRETS !== "true") {
    throw new HttpError(
      503,
      "Certificate signing is not configured: set CERT_SIGNING_KEY (generate one with `npm run secrets`) and restart the server."
    );
  }
  // Development: generate once and keep in the settings table
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, "cert_keypair"));
  let privatePem = (row?.value as { privatePem?: string } | undefined)?.privatePem;
  if (!privatePem) {
    const pair = generateKeyPairSync("ed25519");
    privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    await db
      .insert(settings)
      .values({ key: "cert_keypair", value: { privatePem } })
      .onConflictDoNothing();
    const [stored] = await db.select().from(settings).where(eq(settings.key, "cert_keypair"));
    privatePem = (stored.value as { privatePem: string }).privatePem;
    console.warn("[cert] Generated a development signing key. Set CERT_SIGNING_KEY in production.");
  }
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(privateKey);
  return { privateKey, publicKey, keyId: keyIdOf(publicKey), source: "database" };
}

function keys(): Promise<KeyPair> {
  keyPromise ??= loadKeys().catch((err) => {
    keyPromise = null;
    throw err;
  });
  return keyPromise;
}

export async function publicKeyInfo(): Promise<{ keyId: string; publicKeyPem: string; source: string }> {
  const k = await keys();
  return {
    keyId: k.keyId,
    publicKeyPem: k.publicKey.export({ type: "spki", format: "pem" }).toString(),
    source: k.source,
  };
}

/** The certified content of a record. Changing any of these fields invalidates the certificate. */
export function recordHashPayload(row: RecordRow): Record<string, unknown> {
  return {
    record_id: row.id,
    document_id: row.documentId,
    version: row.version,
    owner_name: row.ownerName,
    father_name: row.fatherName ?? null,
    owners: row.owners ?? [],
    khasra_number: row.khasraNumber,
    khata_number: row.khataNumber,
    survey_number: row.surveyNumber ?? null,
    land_type: row.landType ?? null,
    area: row.area,
    area_unit: row.areaUnit,
    village: row.village,
    tehsil: row.tehsil,
    district: row.district,
    state: row.state,
    registration_number: row.registrationNumber ?? null,
    mutation_number: row.mutationNumber ?? null,
    mutation_date: row.mutationDate ?? null,
    record_year: row.recordYear ?? null,
  };
}

export function recordHash(row: RecordRow): string {
  return sha256Hex(canonicalJson(recordHashPayload(row)));
}

function signedPayload(cert: Omit<Certificate, "signature">): string {
  return canonicalJson(cert);
}

export async function issueCertificate(input: {
  record: RecordRow;
  documentSha256: string | null;
  certifiedBy: string;
  certifiedAt: string;
  auditHead: string | null;
}): Promise<Certificate> {
  const k = await keys();
  const unsigned: Omit<Certificate, "signature"> = {
    record_id: input.record.id,
    version: input.record.version,
    record_hash: recordHash(input.record),
    document_sha256: input.documentSha256,
    certified_at: input.certifiedAt,
    certified_by: input.certifiedBy,
    audit_head: input.auditHead,
    key_id: k.keyId,
    algorithm: "Ed25519",
  };
  const signature = sign(null, Buffer.from(signedPayload(unsigned)), k.privateKey).toString("base64");
  return { ...unsigned, signature };
}

export interface CertificateCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface CertificateVerification {
  valid: boolean;
  certificate: Certificate | null;
  checks: CertificateCheck[];
}

/** Independently re-verifies a record's certificate against the live data. */
export async function verifyCertificate(record: RecordRow, document: DocumentRow | undefined): Promise<CertificateVerification> {
  const cert = record.certificate ?? null;
  if (!cert) {
    return {
      valid: false,
      certificate: null,
      checks: [{ name: "Certificate issued", ok: false, detail: "This record has not been certified (approve it first)." }],
    };
  }
  const checks: CertificateCheck[] = [];
  const k = await keys();

  const { signature, ...unsigned } = cert;
  let sigOk = false;
  try {
    sigOk =
      cert.key_id === k.keyId &&
      verify(null, Buffer.from(signedPayload(unsigned)), k.publicKey, Buffer.from(signature, "base64"));
  } catch {
    sigOk = false;
  }
  checks.push({
    name: "Digital signature",
    ok: sigOk,
    detail: sigOk ? `Ed25519 signature valid (key ${cert.key_id})` : "Signature does not match the issuing key",
  });

  const currentHash = recordHash(record);
  const hashOk = currentHash === cert.record_hash;
  checks.push({
    name: "Record unchanged since certification",
    ok: hashOk,
    detail: hashOk ? `SHA-256 ${currentHash.slice(0, 16)}… matches` : "Record content differs from the certified snapshot",
  });

  if (cert.document_sha256 && document) {
    const file = await getStorage().get(document.storageKey);
    const fileHash = file ? sha256Hex(file) : null;
    const docOk = fileHash === cert.document_sha256;
    checks.push({
      name: "Source document integrity",
      ok: docOk,
      detail: docOk
        ? `Stored scan hash ${fileHash!.slice(0, 16)}… matches`
        : fileHash
          ? "Stored scan has been modified"
          : "Source scan missing from repository",
    });
  }

  if (cert.audit_head) {
    const db = await getDb();
    const [anchor] = await db.select({ seq: auditLog.seq }).from(auditLog).where(eq(auditLog.hash, cert.audit_head));
    const chain = await verifyAuditChain();
    const [{ position }] = anchor
      ? await db.select({ position: sql<number>`count(*)::int` }).from(auditLog).where(lte(auditLog.seq, anchor.seq))
      : [{ position: 0 }];
    const auditOk = Boolean(anchor) && chain.valid;
    checks.push({
      name: "Audit trail anchored",
      ok: auditOk,
      detail: auditOk
        ? `Anchored at audit entry ${position} of ${chain.checked}; chain intact`
        : !anchor
          ? "Anchor entry not found in the audit log"
          : `Audit chain broken at entry #${chain.brokenAtSeq}`,
    });
  }

  const statusOk = record.status === "VERIFIED";
  checks.push({
    name: "Record status",
    ok: statusOk,
    detail: statusOk ? "Verified" : `Current status is ${record.status}`,
  });

  return { valid: checks.every((c) => c.ok), certificate: cert, checks };
}

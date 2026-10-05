// Exports one processed record from a running Dharohar server into a static snapshot used by the
// public workflow walkthrough (/walkthrough), so the demo works without a database or sign-in.
//
// Usage: node scripts/export-demo-snapshot.mjs <recordId> [baseUrl]
//   env: DEMO_EXPORT_EMAIL / DEMO_EXPORT_PASSWORD (an admin account; defaults to the training admin)
//
// Writes src/components/showcase/snapshot.json and public/demo-snapshot/* (page images, QR code).
import { mkdirSync, writeFileSync } from "fs";

const [recordId, base = "http://localhost:3000"] = process.argv.slice(2);
if (!recordId) {
  console.error("Usage: node scripts/export-demo-snapshot.mjs <recordId> [baseUrl]");
  process.exit(1);
}
const email = process.env.DEMO_EXPORT_EMAIL ?? "admin@dharohar.gov";
const password = process.env.DEMO_EXPORT_PASSWORD ?? "admin123";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`Sign-in failed (${login.status})`);
const cookie = login.headers.get("set-cookie").split(";")[0];

async function get(path) {
  const res = await fetch(base + path, { headers: { cookie } });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`${path}: ${json.error ?? res.status}`);
  return json.data;
}
async function download(path, target) {
  const res = await fetch(base + path, { headers: { cookie } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  const ext = type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : type.includes("svg") ? "svg" : "bin";
  let bytes = Buffer.from(await res.arrayBuffer());
  let file = `${target}.${ext}`;
  // Keep the hosted demo fast: large page renders are re-encoded as JPEG
  if (bytes.length > 600 * 1024 && ext !== "svg") {
    const sharp = (await import("sharp")).default;
    bytes = await sharp(bytes).jpeg({ quality: 82 }).toBuffer();
    file = `${target}.jpg`;
  }
  writeFileSync(`public/demo-snapshot/${file}`, bytes);
  return `/demo-snapshot/${file}`;
}

mkdirSync("public/demo-snapshot", { recursive: true });
const detail = await get(`/api/records/${recordId}`);
if (!detail.document) throw new Error("The export account must be able to view documents");
const certificate = detail.record.certificate ? await get(`/api/records/${recordId}/certificate`) : null;
const chain = await get("/api/audit/verify");
const { settings } = await get("/api/settings");

// Page images: replace authenticated API URLs with static files
for (const page of detail.document.pages) {
  if (page.imageUrl) page.imageUrl = await download(page.imageUrl, `page-${page.page}-original`);
  if (page.processedImageUrl) page.processedImageUrl = await download(page.processedImageUrl, `page-${page.page}-enhanced`);
}
const qr = certificate ? await download(`/api/public/qr/${recordId}`, "qr") : null;

const snapshot = {
  exportedAt: new Date().toISOString(),
  recordId,
  detail,
  certificate,
  chain,
  settings,
  qr,
};
writeFileSync("src/components/showcase/snapshot.json", JSON.stringify(snapshot));
console.log(`Exported ${recordId} (${detail.document.name}) — ${detail.auditEvents.length} audit events, certificate: ${certificate ? "yes" : "no"}`);

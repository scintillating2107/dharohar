/**
 * End-to-end API smoke test: login → upload PNG → process → record → verify.
 * Run: node scripts/e2e-pipeline.mjs
 * Requires: npm run dev on port 3000
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

const breakpoints = [];
const ok = [];

function fail(step, detail) {
  breakpoints.push({ step, detail });
  console.error(`✗ ${step}: ${detail}`);
}

function pass(step, detail = "") {
  ok.push(step);
  console.log(`✓ ${step}${detail ? ` — ${detail}` : ""}`);
}

async function prepareSamplePng() {
  const outDir = path.join(ROOT, "data", "e2e");
  await mkdir(outDir, { recursive: true });
  const out = path.join(outDir, "land-record-sample.png");
  const labelSvg = `
    <svg width="800" height="1100" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="1100" fill="#faf8f5"/>
      <text x="60" y="120" font-family="serif" font-size="22" fill="#333">Khasra: 235/1</text>
      <text x="60" y="160" font-family="serif" font-size="22" fill="#333">Khata: 124</text>
      <text x="60" y="200" font-family="serif" font-size="22" fill="#333">Owner: Ram Singh</text>
      <text x="60" y="240" font-family="serif" font-size="22" fill="#333">Area: 1.80 hectare</text>
      <text x="60" y="280" font-family="serif" font-size="18" fill="#555">Village: Chinhat, Lucknow</text>
    </svg>`;
  try {
    const svgPath = path.join(ROOT, "public", "samples", "land-record-page-1.svg");
    const svg = await readFile(svgPath);
    await sharp(svg).png().toFile(out);
  } catch {
    await sharp(Buffer.from(labelSvg)).png().toFile(out);
  }
  return out;
}

function parseCookies(setCookie) {
  if (!setCookie) return "";
  const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  return parts.map((c) => c.split(";")[0]).join("; ");
}

async function jsonFetch(url, options = {}, cookie = "") {
  const headers = { ...options.headers };
  if (cookie) headers.Cookie = cookie;
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`E2E base: ${BASE}\n`);

  // Health: login page
  try {
    const r = await fetch(`${BASE}/login`);
    if (!r.ok) fail("Server reachable", `GET /login → ${r.status}`);
    else pass("Server reachable");
  } catch (e) {
    fail("Server reachable", e.message);
    console.log("\nStart the app: npm run dev");
    printSummary();
    process.exit(1);
  }

  // SVG not allowed
  const svgBuf = await readFile(path.join(ROOT, "public", "samples", "land-record-page-1.svg"));
  const fdSvg = new FormData();
  fdSvg.append("file", new Blob([svgBuf], { type: "image/svg+xml" }), "sample.svg");
  fdSvg.append("district", "Lucknow");
  fdSvg.append("name", "svg-test");
  const { res: svgRes } = await jsonFetch(`${BASE}/api/documents`, { method: "POST", body: fdSvg });
  if (svgRes.status === 401) {
    pass("Upload rejects unauthenticated (expected before login)");
  }

  // Login
  const login = await jsonFetch(`${BASE}/api/auth/login`, {
    method: "POST",
    body: { email: "data@dharohar.gov", password: "data123" },
  });
  const cookie = parseCookies(login.res.headers.getSetCookie?.() || login.res.headers.get("set-cookie"));
  if (!login.res.ok || !cookie) {
    fail("Login", JSON.stringify(login.data));
    printSummary();
    process.exit(1);
  }
  pass("Login as data officer");

  const { res: svgRes2, data: svgData } = await jsonFetch(
    `${BASE}/api/documents`,
    { method: "POST", body: fdSvg },
    cookie
  );
  if (svgRes2.ok) fail("Upload SVG", "Should reject SVG — only PDF/JPG/PNG allowed");
  else pass("Upload rejects SVG", String(svgData?.error || svgRes2.status));

  const pngPath = await prepareSamplePng();
  pass("Prepared PNG from public sample SVG");

  const pngBuf = await readFile(pngPath);
  const fd = new FormData();
  fd.append("file", new Blob([pngBuf], { type: "image/png" }), "land-record-sample.png");
  fd.append("district", "Lucknow");
  fd.append("state", "Uttar Pradesh");
  fd.append("name", "E2E Chinhat 235-1");
  fd.append("village", "Chinhat");
  fd.append("tehsil", "Sadar");
  fd.append("recordYear", "2025");

  const up = await jsonFetch(`${BASE}/api/documents`, { method: "POST", body: fd }, cookie);
  if (!up.res.ok) {
    fail("Upload PNG", JSON.stringify(up.data));
    printSummary();
    process.exit(1);
  }
  const docId = up.data?.data?.document?.id || up.data?.document?.id;
  if (!docId) {
    fail("Upload PNG", "No document id in response");
    printSummary();
    process.exit(1);
  }
  pass("Upload PNG", docId);

  const proc = await jsonFetch(`${BASE}/api/documents/${docId}/process`, { method: "POST" }, cookie);
  if (!proc.res.ok) {
    fail("Start processing", JSON.stringify(proc.data));
    printSummary();
    process.exit(1);
  }
  pass("Start processing");

  let finalDoc = null;
  let recordId = null;
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const st = await jsonFetch(`${BASE}/api/documents/${docId}`, {}, cookie);
    const doc = st.data?.data?.document || st.data?.document;
    const rec = st.data?.data?.record || st.data?.record;
    if (doc) finalDoc = doc;
    if (rec?.record_id) recordId = rec.record_id;
    const status = doc?.status;
    process.stdout.write(`  … poll ${i + 1}: ${status}\r`);
    if (
      status === "VERIFICATION_REQUIRED" ||
      status === "VERIFIED" ||
      status === "FAILED"
    ) {
      console.log("");
      break;
    }
  }

  if (!finalDoc) {
    fail("Processing poll", "No document returned");
    printSummary();
    process.exit(1);
  }

  if (finalDoc.status === "FAILED") {
    const failedStep = finalDoc.steps?.find((s) => s.status === "failed");
    fail("Pipeline completed", `FAILED at ${failedStep?.key}: ${failedStep?.error}`);
  } else if (finalDoc.status === "VERIFICATION_REQUIRED" || finalDoc.status === "VERIFIED") {
    pass("Pipeline completed", finalDoc.status);
  } else {
    fail("Processing poll", `Timed out — last status ${finalDoc.status}`);
  }

  if (!recordId) {
    fail("Record created", "No record linked after processing");
  } else {
    pass("Record created", recordId);
  }

  // Demo seed record
  const demo = await jsonFetch(`${BASE}/api/records/LR-2026-001245`, {}, cookie);
  if (!demo.res.ok) fail("Demo record LR-2026-001245", JSON.stringify(demo.data));
  else pass("Demo record LR-2026-001245 loads");

  // GIS (survey officer — data officer has no gis permission by design)
  const sLogin = await jsonFetch(`${BASE}/api/auth/login`, {
    method: "POST",
    body: { email: "survey@dharohar.gov", password: "survey123" },
  });
  const sCookie = parseCookies(sLogin.res.headers.getSetCookie?.() || sLogin.res.headers.get("set-cookie"));
  const gis = await jsonFetch(`${BASE}/api/gis`, {}, sCookie);
  const parcels = gis.data?.data?.parcels || gis.data?.parcels;
  if (!gis.res.ok || !Array.isArray(parcels)) fail("GIS API", JSON.stringify(gis.data));
  else pass("GIS API", `${parcels.length} parcel(s)`);

  // Verification approve (verification officer)
  if (recordId && finalDoc?.status === "VERIFICATION_REQUIRED") {
    const vLogin = await jsonFetch(`${BASE}/api/auth/login`, {
      method: "POST",
      body: { email: "verification@dharohar.gov", password: "verify123" },
    });
    const vCookie = parseCookies(vLogin.res.headers.getSetCookie?.() || vLogin.res.headers.get("set-cookie"));
    const approve = await jsonFetch(
      `${BASE}/api/verification/${recordId}`,
      {
        method: "POST",
        body: { action: "approve", fields: {} },
      },
      vCookie
    );
    if (!approve.res.ok) fail("Verification approve", JSON.stringify(approve.data));
    else pass("Verification approve", recordId);
  }

  printSummary();
  process.exit(breakpoints.length ? 1 : 0);
}

function printSummary() {
  console.log("\n--- Summary ---");
  console.log(`Passed: ${ok.length}`);
  console.log(`Breakpoints: ${breakpoints.length}`);
  for (const b of breakpoints) {
    console.log(`  • [${b.step}] ${b.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

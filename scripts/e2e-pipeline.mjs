/**
 * End-to-end test against a running server, exercising every role through the HTTP API:
 * upload → background pipeline → verification (edit + approve) → signed certificate →
 * surveyed boundary → citizen claim → external API key → audit chain.
 *
 * Usage:  npm run build && npm start      (in another terminal)
 *         node scripts/e2e-pipeline.mjs   [E2E_BASE_URL=http://localhost:3000]
 */
import sharp from "sharp";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
let failures = 0;

function check(cond, label, detail = "") {
  if (cond) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
  return cond;
}

class Session {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async req(method, path, body, headers = {}) {
    const init = { method, headers: { ...headers, ...(this.cookie ? { cookie: this.cookie } : {}) }, redirect: "manual" };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers["content-type"] = "application/json";
    }
    const res = await fetch(BASE + path, init);
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const type = res.headers.get("content-type") || "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data };
  }
  async login(email, password) {
    const r = await this.req("POST", "/api/auth/login", { email, password });
    if (r.status !== 200) throw new Error(`${this.name} login failed: ${JSON.stringify(r.data)}`);
    return r.data.data.user;
  }
}

async function scan(lines) {
  const text = lines
    .map((t, i) => `<text x="80" y="${150 + i * 70}" font-family="Arial, sans-serif" font-size="27" fill="#1d1d1d">${t}</text>`)
    .join("");
  const svg = `<svg width="1240" height="1754" xmlns="http://www.w3.org/2000/svg"><rect width="1240" height="1754" fill="#efe8d8"/>${text}</svg>`;
  return sharp(Buffer.from(svg)).rotate(-2, { background: "#efe8d8" }).blur(0.5).jpeg({ quality: 82 }).toBuffer();
}

async function waitForStatus(session, docId, statuses, timeoutMs = 300000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    const r = await session.req("GET", `/api/documents/${docId}`);
    last = r.data.data?.document;
    if (statuses.includes(last?.status)) return r.data.data;
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error(`Timed out waiting for ${docId}; last status ${last?.status} ${last?.error ?? ""}`);
}

async function main() {
  console.log(`Dharohar end-to-end test against ${BASE}\n`);
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check(health.status === "ok", "server healthy");

  // --- Security basics
  const anon = new Session("anon");
  check((await anon.req("GET", "/api/records")).status === 401, "API rejects anonymous access");
  const bad = await anon.req("POST", "/api/auth/login", { email: "data@dharohar.gov", password: "wrong" });
  check(bad.status === 401, "wrong password rejected");

  // --- Data officer uploads
  console.log("\nData officer");
  const data = new Session("data");
  await data.login("data@dharohar.gov", "data123");
  const fake = new FormData();
  fake.append("file", new Blob([Buffer.from("not a scan")], { type: "application/pdf" }), "fake.pdf");
  check((await data.req("POST", "/api/documents", fake)).status === 400, "upload rejects a non-scan disguised as PDF");

  const plot = `${200 + Math.floor(Math.random() * 700)}/${1 + Math.floor(Math.random() * 9)}`;
  const form = new FormData();
  form.append(
    "file",
    new Blob([await scan(["Khatauni - Record of Rights", "District: Lucknow    Tehsil: Sadar", "Village: Chinhat", "Khata No: 431", "Owner: Sita Devi", "Father: Ram Prasad", `Khasra No: ${plot}`, "Area: 0.3120 hectare", "Land Type: Agricultural"])], { type: "image/jpeg" }),
    "khatauni-chinhat.jpg"
  );
  form.append("district", "Lucknow");
  form.append("state", "Uttar Pradesh");
  form.append("recordType", "Khatauni / Record of Rights");
  form.append("language", "en");
  form.append("autoProcess", "true");
  const up = await data.req("POST", "/api/documents", form);
  check(up.status === 200, "scan uploaded and queued", up.data.data?.document?.id);
  const docId = up.data.data.document.id;

  const processed = await waitForStatus(data, docId, ["VERIFICATION_REQUIRED", "FAILED"]);
  check(processed.document.status === "VERIFICATION_REQUIRED", "background pipeline completed", processed.document.error ?? processed.document.ocrEngine);
  for (const step of processed.document.steps) {
    if (step.status === "completed" && step.detail) console.log(`      · ${step.label}: ${step.detail}`);
  }
  const record = processed.record;
  check(record?.khasra_number === plot, "khasra extracted", record?.khasra_number);
  check(/sita devi/i.test(record?.owner_name ?? ""), "owner extracted", record?.owner_name);
  check(record?.village === "Chinhat" && record?.district === "Lucknow", "location canonicalised", `${record?.village}, ${record?.district}`);
  check(Math.abs((record?.area_hectares ?? 0) - 0.312) < 0.001, "area converted to hectares", String(record?.area_hectares));
  check(Boolean(record?.fields?.khasra_number?.location), "khasra located on the scan");
  check((await data.req("POST", `/api/verification/${record.record_id}`, { action: "approve" })).status === 403, "data officer cannot approve");

  // --- Verification officer edits and approves
  console.log("\nVerification officer");
  const officer = new Session("officer");
  await officer.login("verification@dharohar.gov", "verify123");
  const queue = await officer.req("GET", "/api/verification?status=OPEN&pageSize=50");
  check(queue.data.data.items.some((t) => t.recordId === record.record_id), "record is in the verification queue");
  const draft = await officer.req("POST", `/api/verification/${record.record_id}`, {
    action: "save_draft",
    fields: { father_name: "Ram Prasad Verma" },
    comment: "Father's surname from register",
  });
  // On a reused database the same correction may already be learned (applied at extraction),
  // in which case the officer's value is unchanged and the field keeps source "learned".
  const father = draft.data.data?.record?.fields?.father_name;
  const draftOk = draft.status === 200 && father?.value === "Ram Prasad Verma" && (father.source === "officer" || father.source === "learned");
  check(
    draftOk,
    draftOk
      ? `draft edit saved and re-validated${father.source === "learned" ? " (value already applied by a learned correction)" : ""}`
      : `draft edit saved and re-validated (got ${draft.status}: ${draft.data.error ?? JSON.stringify(father)})`
  );
  const approved = await officer.req("POST", `/api/verification/${record.record_id}`, { action: "approve", comment: "Matches tehsil register" });
  check(approved.status === 200 && approved.data.data.record.status === "VERIFIED", "record approved", approved.data.error);
  check(approved.data.data?.record?.certificate?.algorithm === "Ed25519", "certificate issued");

  const pub = await anon.req("GET", `/api/public/verify/${record.record_id}`);
  check(pub.status === 200 && pub.data.data.valid === true, "public verification passes", pub.data.data?.checks?.filter((c) => !c.ok).map((c) => c.name).join(", "));
  const qr = await fetch(`${BASE}/api/public/qr/${record.record_id}`);
  check(qr.headers.get("content-type") === "image/png", "QR code served");
  const page = await fetch(`${BASE}/verify/${record.record_id}`).then((r) => r.text());
  check(page.includes("Authentic"), "public verification page renders without login");

  // --- Survey officer sets a boundary
  console.log("\nSurvey officer");
  const survey = new Session("survey");
  await survey.login("survey@dharohar.gov", "survey123");
  const lat = 26.88;
  const lng = 81.05;
  const d = 0.0025; // ≈ 250 m × 280 m ≈ 7 ha, deliberately not matching 0.312 ha
  const geometry = { type: "Polygon", coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]] };
  const geo = await survey.req("PUT", `/api/gis/${record.record_id}`, { geometry });
  check(geo.status === 200 && geo.data.data.check.withinTolerance === false, "boundary stored; area mismatch detected", `${geo.data.data?.check?.polygonAreaHa} ha`);
  const parcels = await survey.req("GET", `/api/gis?search=${encodeURIComponent(record.record_id)}`);
  check(parcels.data.data.parcels[0]?.geometry_source === "surveyed", "parcel is now surveyed");

  // --- Citizen claims the record
  console.log("\nCitizen");
  const citizen = new Session("citizen");
  const email = `sita.${Date.now()}@example.in`;
  const reg = await citizen.req("POST", "/api/auth/register", { name: "Sita Devi", email, password: "secure1234", district: "Lucknow" });
  check(reg.status === 200, "citizen registered");
  check((await citizen.req("POST", "/api/auth/register", { name: "X", email: "y@z.in", password: "short" })).status === 400, "weak password rejected");
  const claim = await citizen.req("POST", "/api/claims", { recordId: record.record_id, relationship: "Owner", note: "Khatauni copy dated 2024" });
  check(claim.status === 200, "ownership claim submitted");
  const claimId = claim.data.data.id;
  check((await citizen.req("GET", "/api/documents")).status === 403, "citizen cannot list scanned documents");
  const decision = await officer.req("POST", `/api/claims/${claimId}`, { decision: "APPROVED", comment: "Identity checked" });
  check(decision.status === 200, "officer approved claim");
  const cdash = await citizen.req("GET", "/api/citizen/dashboard");
  check(cdash.data.data.myRecords.some((r) => r.recordId === record.record_id), "record appears in citizen portal");

  // --- Admin: API key and external API
  console.log("\nAdmin / integrations");
  const admin = new Session("admin");
  await admin.login("admin@dharohar.gov", "admin123");
  const key = await admin.req("POST", "/api/integrations/keys", { name: "E2E LRMS", scopes: ["records:read", "parcels:read", "certificates:read", "export:read"] });
  check(key.status === 200, "API key created");
  const auth = { authorization: `Bearer ${key.data.data.key}` };
  const ext = await anon.req("GET", `/api/v1/records/${record.record_id}`, undefined, auth);
  check(ext.status === 200 && ext.data.data.status === "VERIFIED", "external API returns the verified record");
  const geojson = await anon.req("GET", "/api/v1/parcels?surveyed_only=true", undefined, auth);
  check(geojson.data.type === "FeatureCollection" && geojson.data.features.length > 0, "GeoJSON parcels feed");
  const csv = await anon.req("GET", "/api/v1/export?format=csv", undefined, auth);
  check(typeof csv.data === "string" && csv.data.includes(record.record_id), "CSV export contains the record");
  check((await anon.req("GET", "/api/v1/records", undefined, { authorization: "Bearer dh_00000000_nope" })).status === 401, "invalid API key rejected");

  const chain = await admin.req("GET", "/api/audit/verify");
  check(chain.data.data.valid === true, "audit hash chain intact", `${chain.data.data.checked} entries`);
  const analytics = await admin.req("GET", "/api/analytics");
  check(analytics.data.data.accuracy.fieldsMeasured > 0, "accuracy measured from corrections", `${analytics.data.data.accuracy.overall}%`);

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

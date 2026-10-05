# Dharohar — Land Record Digitization & Validation

Implementation of **Smart India Hackathon problem statement 26018** (Department of Land Resources):
scanned land records → enhanced page images → multilingual OCR → structured fields → validation →
officer verification → digitally signed record → GIS parcel → APIs for LRMS / DILRMP.

Everything shown in the UI is computed from real data: there are no mock records, simulated steps
or hard-coded charts. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it works and
[docs/STUDY_ALIGNMENT.md](docs/STUDY_ALIGNMENT.md) for the requirement-by-requirement mapping.

## Quick start (single machine)

```bash
npm install
cp .env.example .env.local      # optional in development
npm run dev                     # http://localhost:3000
```

No external database is needed: an embedded PostgreSQL (PGlite) is created in `data/pgdata` and
migrated automatically. In development, training accounts are created on first start:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dharohar.gov | admin123 |
| Data officer | data@dharohar.gov | data123 |
| Verification officer | verification@dharohar.gov | verify123 |
| Survey officer | survey@dharohar.gov | survey123 |
| Citizen | citizen@dharohar.gov | citizen123 |

The first OCR run downloads Tesseract language models (~10–20 MB each) into `data/tesseract-cache`.

> **Windows:** run commands from the folder with its exact on-disk casing (e.g. `C:\Users\you\Desktop\dharohar`,
> not `...\desktop\...`). A case mismatch makes Next.js load its runtime twice and the build fails with
> “Expected workStore to be initialized”.

## Workflow

1. **Data officer** uploads a PDF / JPEG / PNG / TIFF (type checked from the file bytes, SHA-256 fingerprinted, duplicates flagged).
2. A background job renders pages, measures quality (sharpness, ink contrast, noise, skew), deskews and flattens the background,
   detects orientation and script (Tesseract OSD), OCRs every page with word boxes, extracts fields
   (Gemini when configured, cross-checked by a bilingual rule engine), and validates them. Failed jobs retry and resume from the failed step.
3. **Verification officer** reviews the record next to the scan — each field is highlighted where it was read — edits values
   and owners, then approves (record is versioned, SHA-256 hashed and Ed25519-signed), rejects, or sends it back for reprocessing.
4. **Survey officer** uploads a GeoJSON/KML boundary or draws it; the geodesic area is checked against the recorded area.
5. **Citizen** registers, claims a record by ID; an officer approves the claim. Anyone can verify a printed record via its QR code (`/verify/LR-…`).
6. **Admin** sets thresholds (review, auto-approve, maker-checker, learning), imports LGD master data, manages users, API keys and webhooks.

Every action is written to a SHA-256 hash-chained audit log (`/audit` → *Verify chain*). Officer corrections are stored and
used to measure accuracy, as few-shot examples for extraction, and as learned substitutions (`/analytics`).

## Production

```bash
npm run secrets            # prints JWT_SECRET, INTEGRATION_SERVICE_KEY, CERT_SIGNING_KEY
```

Required: `JWT_SECRET`, `INTEGRATION_SERVICE_KEY`, `CERT_SIGNING_KEY`. Create the first admin with
`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (demo accounts are not seeded in production).

**Docker (recommended):** `docker compose up --build` runs the app with PostgreSQL; see `docker-compose.yml`.

**Vercel / serverless:** set `DATABASE_URL` (managed Postgres, e.g. Neon) and `STORAGE_DRIVER=s3` with a bucket —
the local disk and embedded database are not persistent there. Jobs run after the request that queued them
(`maxDuration` 300 s), so very large PDFs are better served by the Docker deployment.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (normalisation, extraction, validation, image quality) |
| `npm run test:integration` | Full pipeline against a temporary database with real OCR |
| `npm run test:e2e` | Every role through the HTTP API of a running server |
| `npm run secrets` | Generate production secrets |
| `npm run db:generate` | Create a migration after editing `src/server/db/schema.ts` |

## Integration API

Versioned, API-key protected (`Authorization: Bearer dh_…`), described by `/api/v1/openapi.json`:
`/api/v1/records`, `/api/v1/records/{id}`, `/api/v1/records/{id}/certificate`, `/api/v1/parcels` (GeoJSON),
`/api/v1/export?format=csv|json`. Outbound webhooks (`record.verified`, `record.rejected`, `record.extracted`,
`parcel.updated`) are HMAC-signed and retried. See [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md).

## Layout

```
src/server/          database (Drizzle schema, migrations runner, seed), auth, audit chain, job queue,
                     certification, GIS, learning, notifications, webhooks, records service
src/server/pipeline/ image enhancement, OCR, Gemini, extraction, normalisation, validation, orchestrator
src/app/api/         REST endpoints (session) and /api/v1 (API keys)
src/app/(app)/       officer and citizen UI;  src/app/verify/ public certificate page
drizzle/             SQL migrations;  tests/ unit + integration;  scripts/ e2e + secrets
services/            optional Python services (Member 2 ML enhancement; earlier team prototypes)
```

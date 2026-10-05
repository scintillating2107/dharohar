# Architecture

```
Browser (officers, citizens)          External systems (LRMS / DILRMP / GIS)
        │ session cookie (JWT)                 │ API key  /  ◄── signed webhooks
        ▼                                      ▼
Next.js 16 ── middleware (route RBAC) ── route handlers (re-check user + permission in DB)
        │
        ├── PostgreSQL (Drizzle ORM; embedded PGlite or DATABASE_URL)
        │     users · documents · document_pages · ocr_results · records · record_versions
        │     verification_tasks · parcels · audit_log (hash chain) · jobs · corrections
        │     master_locations · citizen_claims · api_keys · webhooks · notifications · settings
        ├── Object storage (local disk or S3): originals, page renders, enhanced pages
        └── Job worker (Postgres queue, FOR UPDATE SKIP LOCKED, retries with backoff)
              process_document · deliver_webhook · send_email · send_sms
```

## Processing pipeline (`src/server/pipeline/run.ts`)

Each step persists its output and timing on the document, so a failed or interrupted job resumes at the
failed step. Unrecoverable failures (missing file, no fields found) are not retried.

| Step | Implementation |
|---|---|
| Page rendering | `pdf-parse` page screenshots at 2×, multi-frame TIFF, EXIF rotation; capped at 3000 px |
| Image enhancement | Quality metrics: Laplacian variance (sharpness), ink-vs-paper contrast, median-residual noise, projection-profile skew. Enhancement: deskew, flat-field background correction, conditional median denoise, ink stretch, conditional unsharp mask. Kept only if it does not lower the measured score. Optional RealESRGAN service. |
| Orientation & language | Tesseract OSD per page: rotates 90/180/270° pages, votes the script; declared language wins; default Hindi + English |
| OCR | Tesseract word boxes and confidences (12 language models). With Gemini, the page text is replaced by Gemini's transcription (better on handwriting) while Tesseract boxes stay as geometry. |
| Field extraction | Gemini structured output (fields + owners + `box_2d`) with officer-correction few-shot examples; bilingual rule engine as fallback and cross-check; each value located on the page by fuzzy-matching OCR word sequences; confidence = 0.6·model + 0.4·OCR; learned substitutions applied |
| Validation | Required fields, khasra/khata formats, area units by state → hectares, plausibility, dates, owner shares, master-data (LGD) place matching in English or Hindi, identical-file detection, cross-script fuzzy duplicates, history comparison with verified records |
| Store | Record created or updated in place (new version + snapshot), verification task (priority from validation & confidence), approximate parcel location from master data |

Gemini failures never fail the pipeline; the step records "Gemini unavailable" and continues with Tesseract + rules.

## Verification & certification (`src/server/records-service.ts`, `certification.ts`)

- Edits re-run validation immediately; every field change is an audit event.
- Approval (optionally maker-checker) writes a new version, issues a certificate
  `{record_hash, document_sha256, audit_head, key_id, signature}` signed with Ed25519, records AI-vs-officer
  corrections, completes the document, notifies the uploader and emits `record.verified`.
- `/verify/{recordId}` and `/api/public/verify/{recordId}` re-check signature, record hash, stored-scan hash and the
  audit chain anchor on every request.

## Audit log (`src/server/audit.ts`)

`hash = SHA-256(prev_hash + canonical_json(event))`, inserted under a transaction-scoped advisory lock.
`/api/audit/verify` recomputes the chain; any edited, inserted or deleted row breaks it.

## Learning (`src/server/learning.ts`)

On approval each AI-read field is stored with the officer's final value. This drives accuracy metrics (overall, per
field, per month, per source), few-shot examples for extraction, learned substitutions (same correction ≥ 2 times with no
competing correction), and a JSONL export for model fine-tuning.

## Access control

Permissions per role live in `src/lib/config.ts` (`ROLE_PERMISSIONS`). The middleware maps URL prefixes to permissions
(`src/lib/rbac.ts`); every route handler calls `requireUser(permission)`, which re-reads the user so deactivation is
immediate. Login is throttled per IP and accounts lock for 15 minutes after 5 failures. Citizens see verified records and
records linked through approved ownership claims.

## Retired prototype modules

The earlier JSON-file prototype (`src/lib/store.ts`, `src/lib/integrations/*`, `src/lib/member-local/*`, `src/mocks`,
`src/app/demo`, `src/app/api/local`, …) is no longer used. Its routes are blocked in the middleware and its files are
excluded from type-checking and linting; they can be deleted.

# Team Integration Guide

How each team member connects their module to Dharohar (Member 1).

## Quick Start for Team Members

1. Read your contract in `docs/API_CONTRACTS.md`
2. Implement your service endpoint
3. Share your base URL with Member 1
4. Member 1 adds your URL to `.env.local`
5. Set `NEXT_PUBLIC_USE_MOCK_DATA=false` when ready to test

---

## Member 2 — Image Processing

**Integration file:** `src/lib/integrations/imageProcessing.ts`

**Service code:** `services/member2-image/ML service (1)/` — see `services/member2-image/README.md`

**Env variable:** `MEMBER2_IMAGE_API_URL=http://your-service:8001`

**Your endpoint:** `POST /process` (JSON + `X-Integration-Key`; reads/writes `data/uploads/{document_id}/`)

**Input:**
```json
{
  "document_id": "DOC-XXX",
  "page_count": 3,
  "file_reference": "filename.pdf"
}
```

**Output:** See `ImageProcessingResult` in `src/types/index.ts`

**Async option:** POST results to `/api/integrations/webhooks` with `type: "image_processing"`

---

## Member 3 — OCR

**Integration file:** `src/lib/integrations/ocr.ts`

**Env variable:** `MEMBER3_OCR_API_URL=http://your-service:8002`

**Your endpoint:** `POST /extract`

**Output:** Must include `pages[].regions[].bbox` for document viewer highlighting

**Async option:** Webhook with `type: "ocr"`

---

## Member 4 — Field Extraction

**Integration file:** `src/lib/integrations/extraction.ts`

**Env variable:** `MEMBER4_EXTRACTION_API_URL=http://your-service:8003`

**Your endpoint:** `POST /extract`

**Output:** Dynamic `fields` object — UI renders any field keys automatically

**Async option:** Webhook with `type: "extraction"`

---

## Member 5 — Validation

**Integration file:** `src/lib/integrations/validation.ts`

**Env variable:** `MEMBER5_VALIDATION_API_URL=http://your-service:8004`

**Your endpoint:** `POST /validate`

**Output:** Include `warnings[]` with `HISTORICAL_MISMATCH` type for comparison UI

**Async option:** Webhook with `type: "validation"`

---

## Member 6 — Database + GIS

**Service code:** `services/member6-database/` (FastAPI — `uvicorn app.main:app --port 8005`)

**Integration file:** `src/lib/integrations/database.ts`

**Env variable:** `MEMBER6_DATABASE_API_URL=http://localhost:8005`

**Endpoints needed:**
- `POST /records` — persist verified record
- `POST /parcels` — persist GIS parcel
- `GET /records/:id` — fetch record
- `GET /parcels` — list parcels for GIS map

When ready, replace `src/lib/store.ts` calls with API calls to your service.

---

## Member 7 — Platform / deployment

**Service code:** `services/member7-platform/` (Docker Compose, CI, Celery worker image)

Use this for PostgreSQL + Redis + containerized API in production. The FastAPI database service implementation is in `services/member6-database` until the Compose `backend/` package is merged.

---

## Testing Your Integration

1. Start Dharohar: `npm run dev`
2. Check health: `GET /api/integrations/health` (or Profile page)
3. Upload a document and start processing
4. Your service will be called at the appropriate pipeline step

## Webhook Format (Async Services)

```bash
curl -X POST http://localhost:3000/api/integrations/webhooks \
  -H "Content-Type: application/json" \
  -H "Cookie: dharohar_session=YOUR_TOKEN" \
  -d '{
    "document_id": "DOC-XXX",
    "type": "ocr",
    "result": { ... }
  }'
```

Types: `image_processing`, `ocr`, `extraction`, `validation`

---

## Contact

Member 1 owns the integration layer. Coordinate API changes through `docs/API_CONTRACTS.md`.

# Solo Developer Guide — All Members in One

You **can do all Member 2–6 work yourself**. Dharohar includes built-in local implementations for every integration module, so a single developer can demo the full land-record pipeline without waiting for teammates.

## Member Roles → Local Implementation

| Member | Module | Built-in location | HTTP endpoint (optional) |
|--------|--------|-------------------|--------------------------|
| **Member 1** | App shell, auth, workflow | `src/app/`, `src/lib/processing-pipeline.ts` | `/api/*` |
| **Member 2** | Image processing | `src/lib/services/local/imageProcessing.ts` | `POST /api/local/member2/process` |
| **Member 3** | OCR | `src/lib/services/local/ocr.ts` | `POST /api/local/member3/extract` |
| **Member 4** | Field extraction | `src/lib/services/local/extraction.ts` | `POST /api/local/member4/extract` |
| **Member 5** | Validation | `src/lib/services/local/validation.ts` | `POST /api/local/member5/validate` |
| **Member 6** | Database + GIS | `src/lib/services/local/database.ts` | `POST /api/local/member6/records`, `/parcels` |

## How It Works (Real Processing)

1. **Upload** — Files saved to `data/uploads/{documentId}/`
2. **PDF rendering** — Each PDF page rasterized to PNG (`pdf-parse` screenshots)
3. **Image prep** — `sharp` enhancement + real blur/quality analysis
4. **OCR** — **Tesseract.js** (`hin+eng`) reads actual pixels from each page image
5. **Field extraction** — Parsed from OCR text + word bounding boxes (not filename guessing)
6. **Validation** — Required fields, khasra format, duplicates, historical area mismatch
7. **Persistence** — Records saved to `data/dharohar-store.json`
8. **GIS** — Parcel centers + polygons from verified record data

**First OCR run downloads Tesseract language data (~15–30s once). Processing a document may take 30–90s depending on pages.**

## Full Demo Flow (One Person)

```text
1. Login as data@dharohar.gov / data123
2. Upload Land_Record_Chinhat_235-1.pdf (or any PDF with khasra/owner text)
3. Start Processing on document detail page
4. Login as verification@dharohar.gov / verify123
5. Review /verification → edit fields → Approve
6. Login as survey@dharohar.gov / survey123
7. View parcel on /gis
8. Login as admin@dharohar.gov / admin123
9. Check /audit and /users
```

## Testing Member APIs Directly

Local service endpoints use header `X-Integration-Key: dharohar-local-dev-key`

```bash
curl -X POST http://localhost:3000/api/local/member3/extract \
  -H "Content-Type: application/json" \
  -H "X-Integration-Key: dharohar-local-dev-key" \
  -d '{"document_id":"DOC-XXXX"}'
```

## When Teammates Join Later

Set env vars to their service URLs — the integration layer switches automatically:

```env
MEMBER3_OCR_API_URL=http://their-server:8002
MEMBER6_DATABASE_API_URL=http://their-server:8005
```

No code changes needed in the main app.

## Improving Accuracy

| Module | Upgrade path |
|--------|--------------|
| OCR | Replace `runOCRLocal` with Tesseract or cloud OCR |
| Extraction | Add NLP model in Member 4 service |
| Validation | Connect historical records DB in Member 5 |
| GIS | Import real cadastral shapefiles in Member 6 |

## Webhooks (Async Processing)

External services can push results:

```bash
curl -X POST http://localhost:3000/api/integrations/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Integration-Key: dharohar-local-dev-key" \
  -d '{"document_id":"DOC-XXX","type":"ocr","result":{...}}'
```

Types: `image_processing`, `ocr`, `extraction`, `validation`, `reprocess`

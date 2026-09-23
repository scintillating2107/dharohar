# API Contracts

Integration contracts between Dharohar (Member 1) and other team modules.

## Member 2 — Image Processing

**Endpoint (proposed):** `POST /api/image-processing/process`

**Input:**
```json
{
  "document_id": "DOC-LR10245",
  "page": 1,
  "file_reference": "..."
}
```

**Output:**
```json
{
  "document_id": "LR10245",
  "pages": [
    {
      "page": 1,
      "processed_image_url": "...",
      "quality_score": 82,
      "blur_detected": false,
      "skew_angle": 0.4,
      "rotation_corrected": true
    }
  ]
}
```

## Member 3 — OCR

**Endpoint (proposed):** `POST /api/ocr/extract`

**Output:**
```json
{
  "document_id": "LR10245",
  "pages": [
    {
      "page": 1,
      "language": "hi",
      "text": "...",
      "regions": [
        {
          "text": "राम सिंह",
          "confidence": 0.96,
          "bbox": [120, 200, 350, 240]
        }
      ]
    }
  ]
}
```

## Member 4 — Field Extraction

**Endpoint (proposed):** `POST /api/extraction/extract`

**Output:**
```json
{
  "document_id": "LR10245",
  "fields": {
    "owner_name": { "value": "राम सिंह", "confidence": 0.96 },
    "khasra_number": { "value": "235/1", "confidence": 0.99 },
    "area": { "value": "0.2450", "unit": "hectare", "confidence": 0.67 }
  }
}
```

## Member 5 — Validation

**Endpoint (proposed):** `POST /api/validation/validate`

**Output:**
```json
{
  "document_id": "LR10245",
  "validation_status": "REVIEW_REQUIRED",
  "validation_score": 86,
  "errors": [],
  "warnings": [
    {
      "field": "area",
      "type": "HISTORICAL_MISMATCH",
      "message": "Area differs from previous record",
      "current_value": "0.2450 hectare",
      "previous_value": "0.3200 hectare"
    }
  ],
  "duplicate": { "detected": false, "similarity": 0 }
}
```

## Member 6 — Database/GIS

**Record endpoint (proposed):** `GET /api/records/:id`

**Output:**
```json
{
  "record_id": "LR10245",
  "owner_name": "Ram Singh",
  "khasra_number": "235/1",
  "khata_number": "124",
  "area": 0.245,
  "village": "Chinhat",
  "tehsil": "Sadar",
  "district": "Lucknow",
  "status": "VERIFIED"
}
```

**GIS endpoint (proposed):** `GET /api/gis/parcels`

**Output:**
```json
{
  "parcel_id": "P2351",
  "khasra_number": "235/1",
  "geometry": {},
  "center": { "lat": 26.8467, "lng": 80.9462 }
}
```

## Internal Application APIs

All current APIs are served from Next.js at `/api/*`:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET/POST /api/documents`
- `GET /api/documents/:id`
- `POST/GET /api/documents/:id/process`
- `GET /api/dashboard`
- `GET /api/verification`
- `GET/POST /api/verification/:id`
- `GET /api/records`
- `GET /api/records/:id`
- `GET /api/validation`
- `GET /api/gis`
- `GET /api/audit`
- `GET/POST /api/users`

## Webhook Callback (Async Integration)

Team members running async processing can push results to:

**Endpoint:** `POST /api/integrations/webhooks`

**Body:**
```json
{
  "document_id": "DOC-LR10245",
  "type": "ocr",
  "result": { ... }
}
```

**Supported types:** `image_processing`, `ocr`, `extraction`, `validation`

Example OCR callback:
```json
{
  "document_id": "DOC-LR10245",
  "type": "ocr",
  "result": {
    "document_id": "DOC-LR10245",
    "pages": [{ "page": 1, "language": "hi", "text": "...", "regions": [] }]
  }
}
```

# Study alignment — Intelligent Land Record Digitization and Validation System (PS 26018)

How each element of the problem statement is implemented. The same table is shown in the app under **About**.

| Requirement | Status | Implementation |
|---|---|---|
| Multilingual recognition | Implemented | Tesseract OSD script/orientation detection; OCR models for Hindi, Marathi, Bengali, Punjabi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Urdu, English |
| Handwritten text | Needs `GEMINI_API_KEY` | Gemini transcription per page; without it handwriting is not reliably read |
| Extraction from PDFs / images | Implemented | PDF, JPEG, PNG, multi-page TIFF; background job queue with resume |
| Poor-quality scans | Implemented | Measured sharpness / contrast / noise / skew; deskew, background flattening, denoise; before/after shown per page |
| Field classification | Implemented | Owners & shares, father/husband, khasra, khata, survey no., area + unit, village, tehsil, district, state, land type, registration, mutation no. & date — each located on the scan |
| Validation & duplicates | Implemented | Formats, units by state, plausibility, dates, shares, LGD master-data matching (English/Hindi), identical-file and cross-script fuzzy duplicates, history comparison |
| Confidence scoring | Implemented | Field confidence = model × OCR evidence; admin-set review / priority / auto-approve thresholds |
| Human verification | Implemented | Split-screen workspace, source highlighting, owners editor, maker-checker, approve / reject / send back |
| Learning over time | Implemented | Correction store → accuracy metrics, few-shot examples, learned substitutions, JSONL export (fine-tuning itself runs outside the app) |
| LRMS / DILRMP / GIS integration | Implemented interfaces | API keys, `/api/v1` (records, certificates, GeoJSON, CSV), signed webhooks; connecting a specific state system is deployment work |
| GIS | Implemented | Surveyed boundaries (GeoJSON/KML upload or drawing) with geodesic area check; approximate placement from master data |
| Secure repository & audit | Implemented | SHA-256 fingerprinted originals, versioned records, hash-chained audit log, Ed25519 certificates with public QR verification |
| Dashboards | Implemented | Throughput, measured accuracy, validation outcomes, error categories, step timings, district/state progress |
| RBAC | Implemented | Five roles, server-enforced permissions, login throttling and lockout, citizen access via approved claims |
| Notifications | Implemented | In-app; email via SMTP and SMS via gateway webhook when configured |

## Known limits

- Accuracy of printed Hindi OCR with Tesseract alone is good on clean scans but misreads some characters on poor
  ones; low-confidence values are flagged for review. Gemini improves this considerably.
- Cadastral map sheets are stored as documents; vectorising map drawings into parcels is not automated.
- Village coordinates come from the master data you import (LGD) or optional OpenStreetMap geocoding.

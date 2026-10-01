# MEMBER 6 — Database + PostGIS + Repository + Audit

## Intelligent Land Record Digitization and Validation System (Dharohar)

### Overview
This repository contains the complete implementation for **Member 6: Database + PostGIS + Repository + Audit** of the AI-powered Land Record Digitization and Validation System.

---

## 🚀 Key Deliverables Implemented

### A. Database Schema (`scripts/schema.sql`, `app/models/`)
- **10 Core Tables**:
  1. `users` — Roles (`ADMIN`, `OFFICER`, `VERIFIER`, `AI_SYSTEM`), authentication, and credentials.
  2. `documents` — Document metadata, mime types, file sizes, upload references.
  3. `document_pages` — Scanned page dimensions, DPI, processed image paths.
  4. `ocr_results` — Raw extracted text, language tag, confidence scores, OCR JSON references.
  5. `land_parcels` — **PostGIS Spatial Geometry** (`boundary` Polygon, `centroid` Point, Lat/Lon, Area sq m / acres, Spatial GIST index).
  6. `land_records` — Khasra No, Khata No, Survey No, Plot Area, Village, Tehsil, District, State, Land Type, Mutation No, Registration No, Confidence score, Status lifecycle.
  7. `land_owners` — Owner Name, Father/Husband Name, Share %, Aadhaar Hash, Address.
  8. `validation_results` — Business rule checks, field-level validation errors, and confidence scores.
  9. `verification_history` — Status transition history, verifier IDs, timestamps, and remarks.
  10. `audit_logs` — ⭐ Comprehensive change tracking, AI extraction diffs vs human officer edits.

---

### B. Document Repository Storage (`app/repository/storage.py`)
Large document files are kept out of normal database columns and managed via `StorageRepository`:
```
storage/
  ├── original_pdfs/       # Original scanned PDF land record documents
  ├── original_images/     # Raw document images (PNG, JPG, TIFF)
  ├── processed_images/    # De-noised & deskewed page images
  ├── ocr_outputs/         # OCR engine JSON & raw text outputs
  ├── extracted_json/      # AI extracted structured land record JSON snapshots
  └── verified_records/    # Verified final land record JSON snapshots
```

---

### C. PostGIS Spatial Land Parcels ⭐ (`app/models/spatial_parcel.py`, `app/services/spatial_service.py`)
- Standard **PostGIS Spatial Geometries** (`POLYGON(SRID=4326)` and `POINT(SRID=4326)`).
- Centroid calculation and GeoJSON FeatureCollection generation (`GET /parcels`, `GET /parcels/{id}`).
- Map data linkage connecting land records (Khasra No, Village, District) with GIS maps.

---

### D. Audit Logs & Change Tracking ⭐ (`app/services/audit_service.py`, `app/routers/audit.py`)
- Automatic tracking of every change:
  - **AI Extracted**: Owner = "Ram Singh"
  - **Officer Corrected**: Owner = "Ramesh Singh"
  - **Timestamp**: 14:32:00
  - **Action**: `HUMAN_VERIFICATION`
- Field-level diff calculation (`old_value` vs `new_value`) + summary JSON diffs.

---

### E. Record Status Lifecycle (`app/models/enums.py`)
Implemented enum workflow for land records and documents:
- `UPLOADED`
- `PROCESSING`
- `OCR_COMPLETED`
- `EXTRACTED`
- `VALIDATION_PENDING`
- `VERIFICATION_REQUIRED`
- `VERIFIED`
- `REJECTED`

---

### F. REST API Endpoints (`app/routers/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/records` | List land records with status, village, tehsil, district, khasra filters & pagination |
| `GET` | `/records/{id}` | Detailed record view with owners, spatial info, and status |
| `POST` | `/records` | Create new land record & save JSON snapshot in repository |
| `PUT` | `/records/{id}` | Human officer edit/verification endpoint (triggers audit log & verification history) |
| `GET` | `/documents/{id}` | Retrieve document metadata and page/OCR references |
| `POST` | `/documents/upload` | Upload PDF/image file into structured repository storage |
| `GET` | `/documents/{id}/download` | Stream/download original PDF, images, or JSON outputs |
| `GET` | `/audit/{record_id}` | Complete audit log timeline for a land record |
| `GET` | `/parcels/{id}` | Spatial parcel details with GeoJSON feature |
| `GET` | `/parcels` | GeoJSON FeatureCollection spatial query |
| `POST` | `/parcels` | Create/update spatial parcel geometry |
| `GET` | `/dashboard/summary` | Aggregated metrics for Member 1 dashboard |

---

## 🛠️ Installation & Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize Database**:
   ```bash
   python scripts/init_db.py
   ```
   *(Or execute `scripts/schema.sql` on your PostgreSQL + PostGIS instance)*

3. **Seed Sample Data**:
   ```bash
   python scripts/seed_data.py
   ```

4. **Run Verification Test Suite**:
   ```bash
   python scripts/run_tests.py
   ```

5. **Start FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8005
   ```
   Open Swagger API Docs at: **http://127.0.0.1:8005/docs**

   In the Next.js app, set `MEMBER6_DATABASE_API_URL=http://localhost:8005`.

# Study alignment — Intelligent Land Record Digitization and Validation System

**Product name:** Dharohar (Land Record Intelligence Platform)

This document maps the **study problem statement** to what is implemented in this repository, what is integrated via team modules, and what is planned for production hardening.

## Background & problems addressed

| Study theme | How Dharohar addresses it |
|-------------|---------------------------|
| Legacy handwritten/scanned/PDF records | Upload PDF and images; PDF rasterization; image enhancement (Member 2) |
| Poor quality, faded text, skew | Enhancement pipeline step; quality/blur/skew metadata on pages |
| Multiple regional languages | `language_detection` pipeline step; multilingual OCR (Gemini / PaddleOCR) |
| Manual digitization cost & errors | Automated OCR → extraction → validation → officer verification |
| Unreliable digital records | Validation rules, duplicate detection, confidence thresholds, audit trail |

## Scope of study — aspect mapping

| Aspect | Implementation |
|--------|----------------|
| **Existing system / manual process** | Documented in `docs/ARCHITECTURE.md`; workflow replaces manual keying with AI-assisted capture |
| **Legacy document processing** | PDF, JPEG, PNG; multi-page documents; processing UI at `/documents/[id]/processing` |
| **Stakeholders** | RBAC roles: Data Officer, Verification Officer, Survey Officer, Admin, Citizen |
| **Data extraction** | Fields in `FIELD_LABELS` / `FIELD_SECTIONS` (`src/lib/config.ts`); Member 4 extraction |
| **Data validation** | Member 5 validation API; `/validation` UI; scores, errors, warnings, duplicates |
| **GIS & database integration** | `/gis` (Leaflet); Member 6 REST stubs; target PostGIS/GeoServer in deployment |
| **Dashboard & monitoring** | Four role dashboards + admin command center; `/api/dashboard` metrics |

## Expected solution checklist

| # | Requirement | Status in Dharohar |
|---|-----------|-------------------|
| 7 | Multilingual document recognition | Pipeline step + OCR integrations; extend with Indic NLP libraries in production |
| 8 | Extraction from PDFs/images | `processing-pipeline.ts`, upload & process APIs |
| 9 | Classification into predefined fields | Gemini/local extraction → `LandRecord` + `ExtractedFieldValue` |
| 10 | Validation, cross-checks, duplicates | `validateRecord`, `ValidationResult.duplicate` |
| 11 | Confidence scoring & uncertain fields | Per-field `confidence`, `needsReview`; verification queue by priority |
| 12 | Human-assisted verification | `/verification`, approve/reject, audit events |
| 13 | AI learning over time | **Roadmap:** feedback loop from verified corrections to retrain/fine-tune |
| 14 | LRMS / DILRMP / GIS integration | REST contracts in `docs/API_CONTRACTS.md`, `docs/TEAM_INTEGRATION.md`, webhooks stub |
| 15 | Secure repository & audit | File storage under `data/uploads`, `/audit`, JWT sessions |
| — | Interactive dashboards (counts, accuracy, pending, geo progress) | Admin/operations/verification/survey + citizen portal |
| — | APIs for government apps | `/api/*` routes documented in `docs/API_CONTRACTS.md` |
| — | Role-based access control | `ROLE_PERMISSIONS`, middleware, `src/lib/rbac.ts` |

## Suggested technology — project mapping

| Component (study) | Dharohar choice |
|-------------------|-----------------|
| Database | In-memory prototype store; **target:** PostgreSQL + PostGIS (Member 6) |
| Computer vision | Member 2 service (RealESRGAN, OpenCV-class preprocessing) |
| GIS | Leaflet in app; **target:** GeoServer/OpenLayers/QGIS backend |
| APIs | Next.js REST routes |
| NLP | Gemini extraction/OCR; spaCy/Hugging Face/Indic NLP as optional services |
| Visualization | Recharts on dashboards |
| Notifications | `/api/notifications`; SMS/email gateways as env-configured adapters |
| Cloud | Deployable to MeghRaj/AWS/Azure; see `.env.example` |

## Demo script for evaluators

1. **Login** as Data Officer → Operations dashboard → upload land record → **Start Processing**.
2. Show pipeline steps: enhancement → OCR → extraction → validation.
3. Login as **Verification Officer** → queue → edit low-confidence fields → approve.
4. **Survey Officer** → GIS map and district/state progress on survey dashboard.
5. **Citizen** → holdings and verified public records in district.
6. **Admin** → command center metrics + **Solution scope** (`/about`) + audit log.

## Honest limitations (prototype)

- Member 6 persistence is stubbed; use PostgreSQL/PostGIS for production DILRMP sync.
- “Learning over time” requires a model feedback pipeline not yet wired end-to-end.
- Full GeoServer cadastral layers and live NIC master DB verification are integration targets, not live in demo env.

For architecture detail see [ARCHITECTURE.md](./ARCHITECTURE.md) and [TEAM_INTEGRATION.md](./TEAM_INTEGRATION.md).

# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Dharohar Web Application                  │
│  (Next.js Frontend + API Routes — Member 1)                 │
├─────────────────────────────────────────────────────────────┤
│  Pages: Dashboard │ Documents │ Verification │ GIS │ Audit  │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (src/services/)                               │
│  Mock ↔ Real API switch via NEXT_PUBLIC_USE_MOCK_DATA       │
├─────────────────────────────────────────────────────────────┤
│  Backend Orchestration (src/lib/processing-pipeline.ts)     │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
     ┌─────▼───┐ ┌────▼────┐ ┌───▼───┐ ┌───▼────┐ ┌──────────┐
     │Member 2 │ │Member 3 │ │Member │ │Member 5│ │ Member 6 │
     │ Image   │ │  OCR    │ │  4    │ │Validati│ │ DB/GIS   │
     │ Process │ │         │ │ NLP   │ │  on    │ │          │
     └─────────┘ └─────────┘ └───────┘ └────────┘ └──────────┘
```

## Processing Pipeline

```
UPLOAD → PDF/IMAGE PROCESSING → OCR → FIELD EXTRACTION
  → VALIDATION → HUMAN VERIFICATION → VERIFIED RECORD → GIS + AUDIT
```

## Authentication

- JWT stored in httpOnly cookie (`dharohar_session`)
- Middleware protects routes and API endpoints
- Role-based permissions defined in `src/lib/config.ts`

## Roles

| Role | Access |
|------|--------|
| ADMIN | Full access + user management |
| VERIFICATION_OFFICER | Verification, records, validation, audit |
| DATA_OFFICER | Documents, records |
| SURVEY_OFFICER | Records, GIS |

## Data Flow

1. **Upload:** Data Officer uploads document via `/documents/upload`
2. **Processing:** Pipeline orchestrates Member 2-5 services sequentially
3. **Verification:** Low-confidence fields flagged; officer reviews in split-screen UI
4. **Storage:** Approved records stored via Member 6 APIs
5. **GIS:** Parcels linked to records on map
6. **Audit:** All actions logged with timestamps

## Mock Mode Architecture

```
Component → Service Layer → [Mock Data | Real API]
```

Only the service layer switches between mock and real implementations.
UI components remain unchanged during integration.

## Folder Responsibilities

| Folder | Purpose |
|--------|---------|
| `src/app/(app)/` | Protected frontend pages |
| `src/app/api/` | Backend API routes |
| `src/components/` | Reusable UI components |
| `src/services/` | Client API abstraction |
| `src/lib/store.ts` | In-memory data (prototype) |
| `src/mocks/` | Mock response data |
| `src/types/` | Shared TypeScript interfaces |

# Dharohar — Land Record Intelligence Platform

**Intelligent Land Record Digitization and Validation System** — AI-powered extraction, validation, human verification, GIS, and dashboards aligned with LRMS / DILRMP modernization.

**Evaluator mapping:** [docs/STUDY_ALIGNMENT.md](docs/STUDY_ALIGNMENT.md) · In-app **Solution scope** (`/about`).

## Overview

Dharohar is a full-stack web application that orchestrates the land record digitization pipeline:

**Upload → Processing → OCR → Field Extraction → Validation → Human Verification → Verified Record → GIS → Audit Trail**

This repository contains **Member 1's integration layer** — the application shell, frontend, backend orchestration, authentication, and mock interfaces for other team modules.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Next.js API Routes (App Router)
- **Auth:** JWT (httpOnly cookies) with role-based access
- **Maps:** Leaflet / react-leaflet
- **Charts:** Recharts
- **State:** In-memory store (prototype) — optional **Member 6** FastAPI service at `services/member6-database`
- **Deploy:** `cd services/member7-platform && docker compose up --build` (runs Member 6 API on port **8005**)

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (always use **port 3000**).

**Page won’t load / spins forever?**

1. Stop extra Node processes (only one `npm run dev` should run).
2. Fresh dev cache: `npm run dev:fresh`
3. First visit after a clean `.next` can take **2–5 minutes** while webpack compiles — keep the tab open until the terminal shows `GET /login 200`.
4. For demos, prefer production mode (faster, no compile wait):
   ```bash
   npm run build
   npm run start
   ```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dharohar.gov | admin123 |
| Verification Officer | verification@dharohar.gov | verify123 |
| Data Officer | data@dharohar.gov | data123 |
| Survey Officer | survey@dharohar.gov | survey123 |
| Citizen | citizen@dharohar.gov | citizen123 |

## Real Workflow

The app starts with an **empty system** — no pre-seeded records. All dashboard metrics come from actual uploads and processing.

1. **Data Officer** (`data@dharohar.gov` / `data123`) — Upload a real PDF/image at `/documents/upload` (use filenames like `Land_Record_Chinhat_235-1.pdf`)
2. Open the document and click **Start Processing** — pipeline runs on the stored file
3. **Verification Officer** (`verification@dharohar.gov` / `verify123`) — Review extracted fields at `/verification`, edit if needed, approve
4. **Survey Officer** — View verified parcels on `/gis` after approval

Set `NEXT_PUBLIC_USE_MOCK_DATA=true` only if you need the old demo mode with fake data.

**Working alone?** See [docs/SOLO_DEVELOPER.md](docs/SOLO_DEVELOPER.md) — you can implement all Member 2–6 modules locally.

## Environment Variables

See `.env.example`. Key variables:

- `NEXT_PUBLIC_USE_MOCK_DATA=false` — Live file-based pipeline (default)
- `JWT_SECRET` — Session signing key
- `NEXT_PUBLIC_API_URL` — API base URL

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (app)/              # Protected application pages
│   ├── api/                # Backend API routes
│   └── login/              # Public login page
├── components/             # Reusable UI components
├── contexts/               # React contexts (auth, toast)
├── lib/                    # Utilities, auth, store, config
├── mocks/                  # Mock data for team integration
└── types/                  # Shared TypeScript types

services/
├── member2-image/          # Image processing (Member 2)
├── member6-database/       # FastAPI DB, GIS, audit (Member 6)
└── member7-platform/       # Docker Compose & CI (Member 7)
docs/
├── ARCHITECTURE.md
├── API_CONTRACTS.md
└── IMPLEMENTATION_PLAN.md
```

## Pipeline Modes

**Live mode (default):** Uploaded files are saved, PDF pages rendered to images, **Tesseract OCR** runs on each page, fields extracted from OCR text, then human verification. Connect team APIs via env vars to override any step.

**Mock mode:** Set `NEXT_PUBLIC_USE_MOCK_DATA=true` for instant fake OCR/extraction (development only).

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Authentication |
| `/dashboard` | Operational dashboard (officers) |
| `/citizen/dashboard` | Citizen portal — my records, services, district verified list |
| `/documents` | Document list |
| `/documents/upload` | Upload workflow |
| `/documents/[id]` | Document details |
| `/documents/[id]/processing` | Processing timeline |
| `/verification` | Verification queue |
| `/verification/[id]` | Split-screen verification |
| `/records` | Land records |
| `/records/[id]` | Record detail |
| `/validation` | Validation results |
| `/gis` | GIS map |
| `/audit` | Audit trail |
| `/users` | User management (Admin) |
| `/profile` | User profile |

## Team Integration

Integration services live in `src/lib/integrations/`:

| File | Member | Function |
|------|--------|----------|
| `imageProcessing.ts` | 2 | `processImages()` |
| `ocr.ts` | 3 | `runOCR()` |
| `extraction.ts` | 4 | `extractFields()` |
| `validation.ts` | 5 | `validateRecord()` |
| `database.ts` | 6 | `persistRecord()`, `persistParcel()` |

Set external URLs in `.env.local` and `NEXT_PUBLIC_USE_MOCK_DATA=false` to connect real services.

Check integration status at `/api/integrations/health` or on the Profile page.

See `docs/API_CONTRACTS.md` for JSON contracts.
See `docs/TEAM_INTEGRATION.md` for step-by-step integration guide per team member.

**Member 3 & 4 (Gemini OCR + extraction):** see `docs/Member3_Member4.md` — set `GEMINI_API_KEY` in `.env.local` and do not set `MEMBER3_OCR_API_URL` unless using a separate OCR service.

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## License

Prototype for hackathon/project use.

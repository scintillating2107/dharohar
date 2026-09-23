# Implementation Plan — Updated

## Current status

Dharohar is a full-stack land record digitization platform (Next.js 16, TypeScript, Tailwind). The live workflow is implemented end to end:

- Auth, RBAC, government UI shell
- Document upload with file storage (`data/uploads/`)
- Real processing: PDF page rendering, Sharp image prep, Tesseract OCR (Hindi + English), field extraction, validation
- Human verification, records, GIS (parcels + polygons), audit trail
- Local Member 2–6 services and optional external API URLs via env
- Persistent JSON store (`data/dharohar-store.json`)

## Run locally

```bash
npm install
npm run dev
```

Set `.env.local` (see README): `JWT_SECRET`, `NEXT_PUBLIC_USE_MOCK_DATA=false`.

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dharohar.gov | admin123 |
| Data Officer | data@dharohar.gov | data123 |
| Verification Officer | verification@dharohar.gov | verify123 |
| Survey Officer | survey@dharohar.gov | survey123 |

## Optional next steps

- PostgreSQL instead of JSON store
- External Member 2–6 microservices in production
- E2E tests (Playwright)

See also: [SOLO_DEVELOPER.md](./SOLO_DEVELOPER.md), [TEAM_INTEGRATION.md](./TEAM_INTEGRATION.md), [API_CONTRACTS.md](./API_CONTRACTS.md).

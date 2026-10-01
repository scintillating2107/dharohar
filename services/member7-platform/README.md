# Member 7 — Platform & deployment

Docker Compose stack for the **Member 6** database/GIS/audit API (`services/member6-database`). The image is built from Member 6 source; nothing is duplicated under `backend/app/`.

## Quick start

```powershell
cd services/member7-platform
cp .env.example .env
docker compose up --build
```

- API: **http://localhost:8005** (Swagger: `/docs`)
- Postgres + PostGIS: `localhost:5432`

In the Next.js app (`.env.local`):

```env
MEMBER6_DATABASE_API_URL=http://localhost:8005
NEXT_PUBLIC_USE_MOCK_DATA=false
```

## Services

| Service   | Role |
|-----------|------|
| `postgres` | PostgreSQL 16 + PostGIS |
| `db-init`  | Runs `scripts/init_db.py` (Member 6 `create_all`) once |
| `backend`  | `uvicorn app.main:app` (Member 6 FastAPI) |

Redis/Celery from the original scaffold are omitted until a worker module exists in the monorepo.

## Build context

`docker-compose.yml` uses build `context: ..` (`services/`) and `dockerfile: member7-platform/backend/Dockerfile`, which copies `member6-database/app` and `member6-database/requirements.txt`.

## Local dev (without Docker)

```powershell
cd services/member6-database
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

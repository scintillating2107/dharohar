# API

All responses from session endpoints use `{ "success": boolean, "data"?: T, "error"?: string }`.
The machine-readable spec for the external API is served at `/api/v1/openapi.json`.

## External API (`/api/v1`, API key)

Create keys under **Integrations** (admin). Send `Authorization: Bearer dh_xxxxxxxx_…`.
Scopes: `records:read`, `parcels:read`, `certificates:read`, `export:read`.

| Method & path | Notes |
|---|---|
| `GET /api/v1/records?district=&tehsil=&village=&state=&khasra=&updated_since=&limit=&offset=&status=ALL` | Verified records by default; `khasra` is normalised (`२३५ / १` = `235/1`) |
| `GET /api/v1/records/{id}` | One record |
| `GET /api/v1/records/{id}/certificate` | Certificate plus live re-verification checks |
| `GET /api/v1/parcels?district=&village=&surveyed_only=true` | GeoJSON FeatureCollection (polygons if surveyed, else points) |
| `GET /api/v1/export?format=csv|json&district=` | Bulk export of verified records |

Record shape: `record_id, version, status, owners[{name, relation_name, relation_type, share}], owner_name, father_name,
khasra_number, khata_number, survey_number, land_type, area, area_unit, area_hectares, village, tehsil, district, state,
registration_number, mutation_number, mutation_date, record_year, verified_at, verified_by,
certificate{record_hash, signature, key_id, certified_at}, updated_at`.

## Webhooks

Registered under **Integrations**. `POST` to your URL with JSON `{ id, event, occurred_at, data }` and headers
`X-Dharohar-Event`, `X-Dharohar-Delivery`, `X-Dharohar-Signature: sha256=<HMAC-SHA256(secret, raw body)>`.
Non-2xx responses are retried up to 6 times with exponential backoff.
Events: `record.extracted`, `record.verified`, `record.rejected`, `parcel.updated`.

## Public endpoints

| Path | Purpose |
|---|---|
| `GET /api/public/verify/{recordId}` | Certificate verification (target of QR codes) |
| `GET /api/public/qr/{recordId}` | PNG QR code to `/verify/{recordId}` |
| `GET /api/health` | Liveness / database check |

## Application endpoints (session cookie)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PATCH /api/auth/me`, `POST /api/auth/register` (citizens), `POST /api/auth/password` |
| Documents | `GET/POST /api/documents` (multipart upload; `autoProcess=true` queues), `GET /api/documents/{id}`, `POST /api/documents/{id}/process` (also resumes failed), `GET /api/documents/{id}/file?page=&variant=enhanced|original&download=1` |
| Verification | `GET /api/verification?status=OPEN&district=&lowConfidence=&validationIssue=&priority=&search=`, `GET /api/verification/{taskOrRecordId}`, `POST /api/verification/{id}` with `{action: save_draft|approve|reject|send_back, fields?, owners?, comment?}` |
| Records | `GET /api/records`, `GET /api/records/{id}`, `GET /api/records/{id}/certificate`, `GET /api/validation?recordId=` |
| GIS | `GET /api/gis?district=&village=&status=&geometry=&search=`, `PUT /api/gis/{recordId}` (JSON `{geometry}` or multipart GeoJSON/KML) |
| Audit | `GET /api/audit?recordId=&documentId=`, `GET /api/audit/verify` |
| Claims | `GET/POST /api/claims`, `POST /api/claims/{id}` `{decision: APPROVED|REJECTED, comment}` |
| Dashboards | `GET /api/dashboard`, `GET /api/analytics`, `GET /api/citizen/dashboard`, `GET /api/notifications`, `POST /api/notifications/read` |
| Learning | `GET /api/learning/metrics`, `GET /api/learning/export` (JSONL) |
| Admin | `GET/POST /api/users`, `PATCH /api/users/{id}`, `GET/PUT /api/admin/settings`, `GET/POST /api/admin/master-data` (CSV), `GET /api/integrations/health`, `GET/POST /api/integrations/keys`, `DELETE /api/integrations/keys/{id}`, `GET/POST /api/integrations/subscriptions`, `PATCH /api/integrations/subscriptions/{id}` |
| Misc | `GET /api/settings`, `GET /api/meta/locations?state=&district=` |

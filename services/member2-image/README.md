# Member 2 — ML service (enhancement + OCR)

Teammate code lives in **`ML service (1)/`**. Models are in **`models/models/RealESRGAN_x4plus.pth`**.

## Run the ML API (Windows)

**Requires Python 3.12** (not 3.13 — `basicsr` / Paddle fail on 3.13).

From repo root:

```powershell
.\scripts\run-member2-ml.ps1
```

First run downloads PyTorch and OCR deps (10–20+ minutes on CPU).

First PaddleOCR run may download extra weights. GPU is used automatically if CUDA is available.

Health check: [http://localhost:8001/health](http://localhost:8001/health)  
Swagger: [http://localhost:8001/docs](http://localhost:8001/docs)

## Connect Dharohar (Member 1 app)

In the **repo root** `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK_DATA=false
MEMBER2_IMAGE_API_URL=http://localhost:8001
MEMBER3_OCR_API_URL=http://localhost:8001
INTEGRATION_SERVICE_KEY=dharohar-local-dev-key
```

Restart `npm run dev`, upload a document, then **Start processing**.

The ML service reads/writes page images under `data/uploads/{document_id}/` and exposes:

| Endpoint | Used by |
|----------|---------|
| `POST /process` | Member 2 — image enhancement |
| `POST /extract` | Member 3 — OCR (same service) |

Standalone uploads (Swagger): `POST /enhance`, `POST /ocr`, `POST /process/upload`.

## Layout

```text
services/member2-image/
  ML service (1)/     ← Python FastAPI app
  models/models/      ← RealESRGAN weights (not in git)
```

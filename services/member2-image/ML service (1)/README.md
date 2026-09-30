# dharohar ml-service README

## ML Service for Land Record Enhancement and OCR

### Installation

```bash
cd ml-service
python -m venv venv
# Windows
venv\Scripts\activate
# Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Model Setup
Place RealESRGAN model at `models/RealESRGAN_x4plus.pth`.
(Download from RealESRGAN official releases if not present).

### CPU/GPU Usage
The service automatically detects CUDA and uses it if available.
If no GPU is present, it will fallback to CPU (slower).

### Running the Service

```bash
uvicorn app:app --host 0.0.0.0 --port 8001
```

### API Examples

Check out the interactive Swagger documentation at `http://localhost:8001/docs`.

### Testing

```bash
pip install pytest
pytest tests/
```

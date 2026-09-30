from fastapi.testclient import TestClient
from app import app
import os
from io import BytesIO

client = TestClient(app)

def test_enhance_no_file():
    response = client.post("/enhance")
    assert response.status_code == 422 # FastAPI standard validation error for missing form field

def test_ocr_no_file():
    response = client.post("/ocr")
    assert response.status_code == 422

def test_process_no_file():
    response = client.post("/process/upload")
    assert response.status_code == 422

import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import Base, get_db
from app.models.enums import RecordStatus

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_api_flow():
    Base.metadata.create_all(bind=engine)

    # 1. Test POST /records
    create_payload = {
        "khasra_number": "450/1",
        "khata_number": "88",
        "survey_number": "SN-901",
        "area": "1.5 Hectares",
        "village": "Chaksu",
        "tehsil": "Chaksu",
        "district": "Jaipur",
        "state": "Rajasthan",
        "land_type": "Agricultural",
        "overall_confidence": 0.95,
        "status": "EXTRACTED",
        "owners": [
            {
                "owner_name": "Suresh Kumar",
                "father_name": "Devi Lal",
                "share_percentage": 100.0,
                "address": "Chaksu Village, Jaipur"
            }
        ]
    }

    res = client.post("/records", json=create_payload)
    assert res.status_code == 201
    record_data = res.json()
    record_id = record_data["id"]
    assert record_data["khasra_number"] == "450/1"

    # 2. Test GET /records/{id}
    res_get = client.get(f"/records/{record_id}")
    assert res_get.status_code == 200
    assert res_get.json()["khata_number"] == "88"

    # 3. Test PUT /records/{id} (Human Officer Edit)
    update_payload = {
        "khasra_number": "450/1",
        "khata_number": "88",
        "village": "Chaksu (Updated)",
        "status": "VERIFIED",
        "remarks": "Verified by Revenue Officer after physical registry cross-check."
    }
    res_put = client.put(f"/records/{record_id}", json=update_payload)
    assert res_put.status_code == 200
    assert res_put.json()["status"] == "VERIFIED"

    # 4. Test GET /audit/{record_id}
    res_audit = client.get(f"/audit/{record_id}")
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert len(logs) >= 1

    # 5. Test GET /dashboard/summary
    res_dash = client.get("/dashboard/summary")
    assert res_dash.status_code == 200
    assert res_dash.json()["total_land_records"] >= 1

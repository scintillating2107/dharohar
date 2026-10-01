from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.land_record import LandRecord
from app.models.document import Document
from app.models.validation import ValidationResult
from app.models.enums import RecordStatus

router = APIRouter(prefix="/dashboard", tags=["Dashboard Aggregates"])

@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Provides aggregated metrics to power Member 1's interactive frontend dashboard."""
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    total_records = db.query(func.count(LandRecord.id)).scalar() or 0

    # Status counts breakdown
    status_counts = {}
    for st in RecordStatus:
        count = db.query(func.count(LandRecord.id)).filter(LandRecord.status == st).scalar() or 0
        status_counts[st.value] = count

    # District wise progress
    district_counts = db.query(
        LandRecord.district,
        func.count(LandRecord.id)
    ).group_by(LandRecord.district).all()

    district_progress = {dist: cnt for dist, cnt in district_counts if dist}

    # Average confidence score
    avg_confidence = db.query(func.avg(LandRecord.overall_confidence)).scalar() or 0.0

    # Validation errors count
    failed_validations = db.query(func.count(ValidationResult.id)).filter(ValidationResult.is_valid == False).scalar() or 0

    return {
        "total_documents_processed": total_documents,
        "total_land_records": total_records,
        "average_extraction_accuracy": round(float(avg_confidence) * 100, 2),
        "status_breakdown": status_counts,
        "pending_verification_cases": status_counts.get(RecordStatus.VERIFICATION_REQUIRED.value, 0) + status_counts.get(RecordStatus.VALIDATION_PENDING.value, 0),
        "total_validation_errors": failed_validations,
        "district_wise_progress": district_progress
    }

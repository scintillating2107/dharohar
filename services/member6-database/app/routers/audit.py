from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/{record_id}", response_model=List[AuditLogResponse])
def get_audit_trail(record_id: str, db: Session = Depends(get_db)):
    """Retrieve complete chronological audit log history for a specific land record or document."""
    logs = db.query(AuditLog).filter(AuditLog.record_id == record_id).order_by(AuditLog.timestamp.desc()).all()
    if not logs:
        # Check if record exists
        pass
    return logs

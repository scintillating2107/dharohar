from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.land_record import LandRecord, LandOwner
from app.models.enums import RecordStatus
from app.schemas.land_record import LandRecordCreate, LandRecordUpdate, LandRecordResponse
from app.services.audit_service import AuditService
from app.repository.storage import storage_repo

router = APIRouter(prefix="/records", tags=["Land Records"])

@router.get("", response_model=List[LandRecordResponse])
def get_records(
    status: Optional[RecordStatus] = Query(None, description="Filter by record status"),
    village: Optional[str] = Query(None, description="Filter by village name"),
    tehsil: Optional[str] = Query(None, description="Filter by tehsil name"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    khasra_number: Optional[str] = Query(None, description="Filter by Khasra number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve list of land records with optional filters and pagination."""
    query = db.query(LandRecord)
    
    if status:
        query = query.filter(LandRecord.status == status)
    if village:
        query = query.filter(LandRecord.village.ilike(f"%{village}%"))
    if tehsil:
        query = query.filter(LandRecord.tehsil.ilike(f"%{tehsil}%"))
    if district:
        query = query.filter(LandRecord.district.ilike(f"%{district}%"))
    if khasra_number:
        query = query.filter(LandRecord.khasra_number == khasra_number)
        
    records = query.order_by(LandRecord.created_at.desc()).offset(skip).limit(limit).all()
    return records

@router.get("/{id}", response_model=LandRecordResponse)
def get_record_by_id(id: str, db: Session = Depends(get_db)):
    """Retrieve details for a single land record by ID."""
    record = db.query(LandRecord).filter(LandRecord.id == id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Land record with ID '{id}' not found."
        )
    return record

@router.post("", response_model=LandRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(payload: LandRecordCreate, db: Session = Depends(get_db)):
    """Create a new land record (from AI pipeline or manual entry) and log creation audit."""
    record_dict = payload.model_dump(exclude={"owners"})
    owners_data = payload.owners

    # Save extracted JSON snapshot in storage repository
    json_filename = f"record_extracted_{payload.khasra_number.replace('/', '_')}.json"
    extraction_json_path = storage_repo.save_json("extracted_json", json_filename, payload.model_dump())
    record_dict["extraction_json_path"] = extraction_json_path

    new_record = LandRecord(**record_dict)
    db.add(new_record)
    db.flush() # Generate new_record.id

    # Add owners
    for o_data in owners_data:
        owner = LandOwner(land_record_id=new_record.id, **o_data.model_dump())
        db.add(owner)

    db.commit()
    db.refresh(new_record)

    # Log Audit Entry
    AuditService.log_action(
        db=db,
        record_id=new_record.id,
        action="CREATE_RECORD",
        entity_type="LandRecord",
        user_id=payload.created_by,
        new_value=f"Khasra {new_record.khasra_number}, Village {new_record.village}",
        changes_summary={"created_fields": payload.model_dump()}
    )

    return new_record

@router.put("/{id}", response_model=LandRecordResponse)
def update_record(id: str, payload: LandRecordUpdate, db: Session = Depends(get_db)):
    """Update a land record (Human verification / officer edit), creating audit logs and verification history."""
    record = db.query(LandRecord).filter(LandRecord.id == id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Land record with ID '{id}' not found."
        )

    old_data = {
        "khasra_number": record.khasra_number,
        "khata_number": record.khata_number,
        "survey_number": record.survey_number,
        "area": record.area,
        "village": record.village,
        "tehsil": record.tehsil,
        "district": record.district,
        "land_type": record.land_type,
        "mutation_number": record.mutation_number,
        "registration_number": record.registration_number,
        "status": record.status.value if record.status else None
    }

    update_dict = payload.model_dump(exclude_unset=True, exclude={"remarks"})
    previous_status = record.status

    # Apply updates
    for field, val in update_dict.items():
        if val is not None and hasattr(record, field):
            setattr(record, field, val)

    # If verified/updated, save verified JSON snapshot in storage repository
    if record.status in [RecordStatus.VERIFIED, RecordStatus.VERIFICATION_REQUIRED]:
        json_filename = f"record_verified_{record.id}.json"
        verified_json_path = storage_repo.save_json("verified_records", json_filename, old_data)
        record.verified_json_path = verified_json_path

    db.commit()
    db.refresh(record)

    new_data = {
        "khasra_number": record.khasra_number,
        "khata_number": record.khata_number,
        "survey_number": record.survey_number,
        "area": record.area,
        "village": record.village,
        "tehsil": record.tehsil,
        "district": record.district,
        "land_type": record.land_type,
        "mutation_number": record.mutation_number,
        "registration_number": record.registration_number,
        "status": record.status.value if record.status else None
    }

    # Record field level diffs in Audit Log
    AuditService.log_field_changes(
        db=db,
        record_id=record.id,
        action="HUMAN_VERIFICATION" if payload.status == RecordStatus.VERIFIED else "UPDATE_RECORD",
        old_data=old_data,
        new_data=new_data,
        user_id=payload.verified_by
    )

    # Record status transition history if status changed
    if payload.status and payload.status != previous_status:
        AuditService.log_verification(
            db=db,
            record_id=record.id,
            verifier_id=payload.verified_by,
            previous_status=previous_status,
            new_status=payload.status,
            remarks=payload.remarks
        )

    return record

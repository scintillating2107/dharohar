from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import RecordStatus

class LandOwnerBase(BaseModel):
    owner_name: str
    father_name: str
    husband_name: Optional[str] = None
    share_percentage: Optional[float] = 100.0
    aadhaar_hash: Optional[str] = None
    address: Optional[str] = None

class LandOwnerCreate(LandOwnerBase):
    pass

class LandOwnerResponse(LandOwnerBase):
    id: str
    land_record_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ValidationResultResponse(BaseModel):
    id: str
    rule_name: str
    rule_category: Optional[str] = "Business Rule"
    is_valid: bool
    field_name: Optional[str] = None
    error_message: Optional[str] = None
    confidence_score: Optional[float] = 1.0
    validated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VerificationHistoryResponse(BaseModel):
    id: str
    verifier_id: Optional[str] = None
    previous_status: RecordStatus
    new_status: RecordStatus
    remarks: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LandRecordBase(BaseModel):
    khasra_number: str
    khata_number: str
    survey_number: Optional[str] = None
    area: str
    village: str
    tehsil: str
    district: str
    state: Optional[str] = "Rajasthan"
    land_type: Optional[str] = "Agricultural"
    mutation_number: Optional[str] = None
    registration_number: Optional[str] = None

class LandRecordCreate(LandRecordBase):
    document_id: Optional[str] = None
    parcel_id: Optional[str] = None
    overall_confidence: Optional[float] = 0.95
    status: Optional[RecordStatus] = RecordStatus.EXTRACTED
    created_by: Optional[str] = None
    owners: List[LandOwnerCreate] = []

class LandRecordUpdate(BaseModel):
    khasra_number: Optional[str] = None
    khata_number: Optional[str] = None
    survey_number: Optional[str] = None
    area: Optional[str] = None
    village: Optional[str] = None
    tehsil: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    land_type: Optional[str] = None
    mutation_number: Optional[str] = None
    registration_number: Optional[str] = None
    overall_confidence: Optional[float] = None
    status: Optional[RecordStatus] = None
    verified_by: Optional[str] = None
    remarks: Optional[str] = None

class LandRecordResponse(LandRecordBase):
    id: str
    document_id: Optional[str] = None
    parcel_id: Optional[str] = None
    extraction_json_path: Optional[str] = None
    verified_json_path: Optional[str] = None
    overall_confidence: float
    status: RecordStatus
    created_by: Optional[str] = None
    verified_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    owners: List[LandOwnerResponse] = []
    validations: List[ValidationResultResponse] = []
    verification_histories: List[VerificationHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)

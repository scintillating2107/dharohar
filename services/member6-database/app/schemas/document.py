from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import RecordStatus

class OCRResultResponse(BaseModel):
    id: str
    document_id: str
    page_id: Optional[str] = None
    raw_text: str
    language: str
    ocr_engine: str
    ocr_output_json_path: str
    confidence_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentPageResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    processed_image_path: str
    width: Optional[int] = None
    height: Optional[int] = None
    dpi: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: str
    file_name: str
    original_file_path: str
    file_type: str
    file_size_bytes: int
    mime_type: str
    status: RecordStatus
    uploaded_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    pages: List[DocumentPageResponse] = []
    ocr_results: List[OCRResultResponse] = []

    model_config = ConfigDict(from_attributes=True)

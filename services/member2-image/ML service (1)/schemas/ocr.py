from pydantic import BaseModel
from typing import List, Tuple, Optional

class OCRRegion(BaseModel):
    text: str
    confidence: float
    bbox: Tuple[int, int, int, int]
    needs_review: bool = False

class OCRPage(BaseModel):
    page_number: int
    width: int
    height: int
    full_text: str
    regions: List[OCRRegion]
    average_confidence: float

class OCRDocument(BaseModel):
    document_id: str
    pages: List[OCRPage]
    full_text: str
    average_confidence: float

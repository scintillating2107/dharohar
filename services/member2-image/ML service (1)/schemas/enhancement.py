from pydantic import BaseModel
from typing import Dict, Optional

class QualityMetrics(BaseModel):
    brightness: float
    contrast: float
    sharpness: float
    estimated_skew: float
    quality: str

class EnhancementResult(BaseModel):
    success: bool
    page_number: int
    original_width: int
    original_height: int
    enhanced_width: int
    enhanced_height: int
    scale: int
    quality: QualityMetrics
    files: Dict[str, str]
    timing: Optional[Dict[str, int]] = None

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ParcelBase(BaseModel):
    khasra_number: str
    survey_number: Optional[str] = None
    village: str
    tehsil: str
    district: str
    state: Optional[str] = "Rajasthan"
    area_sq_meters: Optional[float] = None
    area_acres: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ParcelCreate(ParcelBase):
    geometry_geojson: Optional[Dict[str, Any]] = None

class ParcelResponse(ParcelBase):
    id: str
    created_at: datetime
    updated_at: datetime
    geojson_feature: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

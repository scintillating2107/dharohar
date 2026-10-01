import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.spatial_parcel import LandParcel
from app.schemas.parcel import ParcelCreate, ParcelResponse
from app.services.spatial_service import SpatialService

router = APIRouter(prefix="/parcels", tags=["PostGIS Spatial GIS"])

@router.get("/{id}", response_model=ParcelResponse)
def get_parcel_by_id(id: str, db: Session = Depends(get_db)):
    """Retrieve spatial details and GeoJSON representation for a land parcel by ID."""
    parcel = db.query(LandParcel).filter(LandParcel.id == id).first()
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Land parcel with ID '{id}' not found."
        )

    geojson_feat = SpatialService.parcel_to_geojson_feature(parcel)

    return ParcelResponse(
        id=parcel.id,
        khasra_number=parcel.khasra_number,
        survey_number=parcel.survey_number,
        village=parcel.village,
        tehsil=parcel.tehsil,
        district=parcel.district,
        state=parcel.state,
        area_sq_meters=float(parcel.area_sq_meters) if parcel.area_sq_meters else None,
        area_acres=float(parcel.area_acres) if parcel.area_acres else None,
        latitude=parcel.latitude,
        longitude=parcel.longitude,
        created_at=parcel.created_at,
        updated_at=parcel.updated_at,
        geojson_feature=geojson_feat
    )

@router.get("", response_model=Dict[str, Any])
def get_parcels_geojson(
    village: Optional[str] = Query(None),
    tehsil: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    khasra_number: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Retrieve spatial land parcels as a standard GeoJSON FeatureCollection."""
    query = db.query(LandParcel)
    if village:
        query = query.filter(LandParcel.village.ilike(f"%{village}%"))
    if tehsil:
        query = query.filter(LandParcel.tehsil.ilike(f"%{tehsil}%"))
    if district:
        query = query.filter(LandParcel.district.ilike(f"%{district}%"))
    if khasra_number:
        query = query.filter(LandParcel.khasra_number == khasra_number)

    parcels = query.limit(limit).all()
    features = [SpatialService.parcel_to_geojson_feature(p) for p in parcels]

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("", response_model=ParcelResponse, status_code=status.HTTP_201_CREATED)
def create_spatial_parcel(payload: ParcelCreate, db: Session = Depends(get_db)):
    """Create a new spatial land parcel with PostGIS polygon boundary and lat/lon coordinates."""
    geom_str = json.dumps(payload.geometry_geojson) if payload.geometry_geojson else None

    parcel = LandParcel(
        khasra_number=payload.khasra_number,
        survey_number=payload.survey_number,
        village=payload.village,
        tehsil=payload.tehsil,
        district=payload.district,
        state=payload.state or "Rajasthan",
        area_sq_meters=payload.area_sq_meters,
        area_acres=payload.area_acres,
        latitude=payload.latitude or 26.9124,
        longitude=payload.longitude or 75.7873,
        boundary=geom_str
    )

    db.add(parcel)
    db.commit()
    db.refresh(parcel)

    geojson_feat = SpatialService.parcel_to_geojson_feature(parcel)

    return ParcelResponse(
        id=parcel.id,
        khasra_number=parcel.khasra_number,
        survey_number=parcel.survey_number,
        village=parcel.village,
        tehsil=parcel.tehsil,
        district=parcel.district,
        state=parcel.state,
        area_sq_meters=float(parcel.area_sq_meters) if parcel.area_sq_meters else None,
        area_acres=float(parcel.area_acres) if parcel.area_acres else None,
        latitude=parcel.latitude,
        longitude=parcel.longitude,
        created_at=parcel.created_at,
        updated_at=parcel.updated_at,
        geojson_feature=geojson_feat
    )

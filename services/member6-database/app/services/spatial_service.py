import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.spatial_parcel import LandParcel, HAS_GEOALCHEMY, IS_SQLITE

# Optional shapely import for polygon bounding boxes / spatial math
try:
    import shapely.wkt
    import shapely.geometry
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False

class SpatialService:
    @staticmethod
    def create_geojson_polygon(coordinates: List[List[List[float]]]) -> Dict[str, Any]:
        """Generates standard GeoJSON Polygon format."""
        return {
            "type": "Polygon",
            "coordinates": coordinates
        }

    @staticmethod
    def create_geojson_point(lng: float, lat: float) -> Dict[str, Any]:
        """Generates standard GeoJSON Point format."""
        return {
            "type": "Point",
            "coordinates": [lng, lat]
        }

    @staticmethod
    def parcel_to_geojson_feature(parcel: LandParcel) -> Dict[str, Any]:
        """Converts LandParcel ORM model into a standard GeoJSON Feature."""
        boundary_geom = None
        if parcel.boundary:
            if isinstance(parcel.boundary, str):
                try:
                    boundary_geom = json.loads(parcel.boundary)
                except Exception:
                    boundary_geom = None
            elif hasattr(parcel.boundary, "data"): # WKB/PostGIS geometry
                boundary_geom = parcel.boundary

        # Centroid fallback
        centroid_geom = {
            "type": "Point",
            "coordinates": [parcel.longitude or 75.7873, parcel.latitude or 26.9124]
        }

        return {
            "type": "Feature",
            "id": parcel.id,
            "geometry": boundary_geom or centroid_geom,
            "properties": {
                "khasra_number": parcel.khasra_number,
                "survey_number": parcel.survey_number,
                "village": parcel.village,
                "tehsil": parcel.tehsil,
                "district": parcel.district,
                "state": parcel.state,
                "area_sq_meters": float(parcel.area_sq_meters) if parcel.area_sq_meters else None,
                "area_acres": float(parcel.area_acres) if parcel.area_acres else None,
                "latitude": parcel.latitude,
                "longitude": parcel.longitude,
            }
        }

    @staticmethod
    def get_parcel_by_khasra(
        db: Session,
        khasra_number: str,
        village: str,
        district: str
    ) -> Optional[LandParcel]:
        """Finds spatial parcel by Khasra number and location."""
        return db.query(LandParcel).filter(
            LandParcel.khasra_number == khasra_number,
            LandParcel.village == village,
            LandParcel.district == district
        ).first()

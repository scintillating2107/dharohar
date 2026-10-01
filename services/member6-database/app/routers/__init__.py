from app.routers.records import router as records_router
from app.routers.documents import router as documents_router
from app.routers.audit import router as audit_router
from app.routers.parcels import router as parcels_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "records_router",
    "documents_router",
    "audit_router",
    "parcels_router",
    "dashboard_router"
]

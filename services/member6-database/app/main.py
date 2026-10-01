from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import records_router, documents_router, audit_router, parcels_router, dashboard_router

# Ensure tables are initialized on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend Database, PostGIS Spatial GIS, Storage Repository & Audit Logging System for Dharohar Land Digitization.",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(records_router, prefix=settings.API_PREFIX)
app.include_router(documents_router, prefix=settings.API_PREFIX)
app.include_router(audit_router, prefix=settings.API_PREFIX)
app.include_router(parcels_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)

@app.get("/health")
def health():
    return {"status": "ok", "service": "member6-database"}


@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health": "/health",
    }

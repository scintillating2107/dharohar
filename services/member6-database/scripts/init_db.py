import sys
import os

# Add root folder to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base, engine
from app.models import User, Document, DocumentPage, OCRResult, LandParcel, LandRecord, LandOwner, ValidationResult, VerificationHistory, AuditLog

def init_database():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_database()

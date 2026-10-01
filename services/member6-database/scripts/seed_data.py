import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.document import Document, DocumentPage, OCRResult
from app.models.spatial_parcel import LandParcel
from app.models.land_record import LandRecord, LandOwner
from app.models.validation import ValidationResult, VerificationHistory
from app.models.audit import AuditLog
from app.models.enums import RecordStatus, UserRole
from app.repository.storage import storage_repo
from app.services.audit_service import AuditService

def seed_data():
    print("Seeding database with sample land records, PostGIS parcels, and repository files...")
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Create Default Users
        officer = db.query(User).filter(User.username == "officer1").first()
        if not officer:
            officer = User(
                username="officer1",
                email="officer.ramesh@rajasthan.gov.in",
                full_name="Ramesh Singh",
                hashed_password="hashed_secure_password_123",
                role=UserRole.OFFICER,
                department="Revenue Department, Jaipur"
            )
            db.add(officer)
            db.commit()
            db.refresh(officer)
            
        verifier = db.query(User).filter(User.username == "verifier1").first()
        if not verifier:
            verifier = User(
                username="verifier1",
                email="verifier.sharma@rajasthan.gov.in",
                full_name="Dr. Alok Sharma",
                hashed_password="hashed_secure_password_456",
                role=UserRole.VERIFIER,
                department="District Collectorate, Jaipur"
            )
            db.add(verifier)
            db.commit()
            db.refresh(verifier)

        # 2. Store Sample Documents & Files in Repository
        sample_pdf_bytes = b"%PDF-1.4 Mock Scanned Jamabandi Land Record Document Content for Testing"
        pdf_rel_path = storage_repo.save_file("original_pdfs", "jamabandi_khasra_235_1.pdf", sample_pdf_bytes)

        ocr_json_payload = {
            "page": 1,
            "raw_text": "ग्राम रामपुर, तहसील सदर, जिला जयपुर। खसरा नंबर 235/1, खाता नंबर 102। खातेदार राम सिंह पिता हरि सिंह। क्षेत्रफल 2.45 हेक्टेयर।",
            "detected_language": "hi",
            "confidence": 0.94
        }
        ocr_rel_path = storage_repo.save_json("ocr_outputs", "jamabandi_khasra_235_1_ocr.json", ocr_json_payload)

        doc = db.query(Document).filter(Document.file_name == "jamabandi_khasra_235_1.pdf").first()
        if not doc:
            doc = Document(
                file_name="jamabandi_khasra_235_1.pdf",
                original_file_path=pdf_rel_path,
                file_type="PDF",
                file_size_bytes=len(sample_pdf_bytes),
                mime_type="application/pdf",
                status=RecordStatus.EXTRACTED,
                uploaded_by=officer.id
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            page = DocumentPage(
                document_id=doc.id,
                page_number=1,
                processed_image_path="processed_images/page_1.png",
                width=1654,
                height=2339,
                dpi=300
            )
            db.add(page)
            db.commit()
            db.refresh(page)

            ocr_res = OCRResult(
                document_id=doc.id,
                page_id=page.id,
                raw_text=ocr_json_payload["raw_text"],
                language="hi",
                ocr_engine="PaddleOCR + Tesseract",
                ocr_output_json_path=ocr_rel_path,
                confidence_score=0.94
            )
            db.add(ocr_res)
            db.commit()

        # 3. Create PostGIS Land Parcel
        parcel = db.query(LandParcel).filter(LandParcel.khasra_number == "235/1").first()
        if not parcel:
            parcel_geojson = {
                "type": "Polygon",
                "coordinates": [[
                    [75.7873, 26.9124],
                    [75.7885, 26.9124],
                    [75.7885, 26.9135],
                    [75.7873, 26.9135],
                    [75.7873, 26.9124]
                ]]
            }
            parcel = LandParcel(
                khasra_number="235/1",
                survey_number="SN-1082",
                village="Rampur",
                tehsil="Sadar",
                district="Jaipur",
                state="Rajasthan",
                area_sq_meters=24500.0,
                area_acres=6.05,
                latitude=26.91295,
                longitude=75.7879,
                boundary=json.dumps(parcel_geojson)
            )
            db.add(parcel)
            db.commit()
            db.refresh(parcel)

        # 4. Create Land Record
        record = db.query(LandRecord).filter(LandRecord.khasra_number == "235/1").first()
        if not record:
            extracted_json = {
                "owner_name": "Ram Singh",
                "father_name": "Hari Singh",
                "khasra_number": "235/1",
                "khata_number": "102",
                "area": "2.45 Hectares",
                "village": "Rampur",
                "tehsil": "Sadar",
                "district": "Jaipur"
            }
            ext_json_path = storage_repo.save_json("extracted_json", "record_extracted_235_1.json", extracted_json)

            record = LandRecord(
                document_id=doc.id,
                parcel_id=parcel.id,
                khasra_number="235/1",
                khata_number="102",
                survey_number="SN-1082",
                area="2.45 Hectares",
                village="Rampur",
                tehsil="Sadar",
                district="Jaipur",
                state="Rajasthan",
                land_type="Agricultural",
                mutation_number="MUT-2024-884",
                registration_number="REG-JP-4421",
                extraction_json_path=ext_json_path,
                overall_confidence=0.92,
                status=RecordStatus.VERIFICATION_REQUIRED,
                created_by=officer.id
            )
            db.add(record)
            db.commit()
            db.refresh(record)

            # Add Owner
            owner = LandOwner(
                land_record_id=record.id,
                owner_name="Ram Singh",
                father_name="Hari Singh",
                share_percentage=100.0,
                address="Village Rampur, Tehsil Sadar, District Jaipur, Rajasthan"
            )
            db.add(owner)

            # Add Validation Result
            val_res = ValidationResult(
                land_record_id=record.id,
                rule_name="Area Consistency Check",
                rule_category="GIS Boundary Match",
                is_valid=True,
                field_name="area",
                error_message=None,
                confidence_score=0.95
            )
            db.add(val_res)
            db.commit()

            # 5. Create Initial Audit Log
            AuditService.log_action(
                db=db,
                record_id=record.id,
                action="AI_EXTRACTION",
                entity_type="LandRecord",
                user_id=None,
                new_value="Ram Singh s/o Hari Singh",
                changes_summary={"extracted_data": extracted_json}
            )

            # Create Officer Edit Audit Log (Requirement E ⭐ example)
            AuditService.log_action(
                db=db,
                record_id=record.id,
                action="HUMAN_VERIFICATION",
                entity_type="LandRecord",
                user_id=officer.id,
                field_name="owner_name",
                old_value="Ram Singh",
                new_value="Ramesh Singh",
                changes_summary={"remarks": "Officer corrected typo in owner name based on physical register."}
            )

        print("Seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

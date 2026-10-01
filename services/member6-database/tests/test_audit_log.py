from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services.audit_service import AuditService
from app.models.audit import AuditLog
from app.models.enums import RecordStatus

def test_audit_logging_and_diffs():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Test direct log action
        log1 = AuditService.log_action(
            db=db,
            record_id="rec-101",
            action="AI_EXTRACTION",
            new_value="Ram Singh"
        )
        assert log1.record_id == "rec-101"
        assert log1.action == "AI_EXTRACTION"

        # Test field diff calculation
        old_data = {"owner_name": "Ram Singh", "area": "2.0 Ha"}
        new_data = {"owner_name": "Ramesh Singh", "area": "2.0 Ha"}

        logs = AuditService.log_field_changes(
            db=db,
            record_id="rec-101",
            action="HUMAN_VERIFICATION",
            old_data=old_data,
            new_data=new_data
        )

        assert len(logs) == 1
        assert logs[0].field_name == "owner_name"
        assert logs[0].old_value == "Ram Singh"
        assert logs[0].new_value == "Ramesh Singh"

    finally:
        db.close()

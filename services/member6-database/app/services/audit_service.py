from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.validation import VerificationHistory
from app.models.enums import RecordStatus

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        record_id: str,
        action: str,
        entity_type: str = "LandRecord",
        user_id: Optional[str] = None,
        field_name: Optional[str] = None,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        changes_summary: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None
    ) -> AuditLog:
        """Creates a detailed audit log record."""
        audit_entry = AuditLog(
            record_id=record_id,
            entity_type=entity_type,
            user_id=user_id,
            action=action,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            changes_summary=changes_summary,
            client_ip=client_ip,
            timestamp=datetime.utcnow()
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

    @staticmethod
    def log_field_changes(
        db: Session,
        record_id: str,
        action: str,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any],
        user_id: Optional[str] = None,
        entity_type: str = "LandRecord"
    ) -> List[AuditLog]:
        """Calculates field diffs between old_data and new_data and logs individual field edits + summary diff."""
        changes = {}
        logged_entries = []
        
        for key, new_val in new_data.items():
            old_val = old_data.get(key)
            if old_val != new_val:
                changes[key] = {
                    "old": old_val,
                    "new": new_val
                }
                # Log specific field change
                log = AuditService.log_action(
                    db=db,
                    record_id=record_id,
                    action=action,
                    entity_type=entity_type,
                    user_id=user_id,
                    field_name=key,
                    old_value=old_val,
                    new_value=new_val
                )
                logged_entries.append(log)
                
        if changes and not logged_entries:
            # Summary diff log
            log = AuditService.log_action(
                db=db,
                record_id=record_id,
                action=action,
                entity_type=entity_type,
                user_id=user_id,
                changes_summary=changes
            )
            logged_entries.append(log)

        return logged_entries

    @staticmethod
    def log_verification(
        db: Session,
        record_id: str,
        verifier_id: Optional[str],
        previous_status: RecordStatus,
        new_status: RecordStatus,
        remarks: Optional[str] = None
    ) -> VerificationHistory:
        """Records human officer verification event."""
        history = VerificationHistory(
            land_record_id=record_id,
            verifier_id=verifier_id,
            previous_status=previous_status,
            new_status=new_status,
            remarks=remarks,
            created_at=datetime.utcnow()
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        
        # Log to audit trail as well
        AuditService.log_action(
            db=db,
            record_id=record_id,
            action="HUMAN_VERIFICATION",
            entity_type="LandRecord",
            user_id=verifier_id,
            field_name="status",
            old_value=previous_status.value,
            new_value=new_status.value,
            changes_summary={"remarks": remarks, "status_change": f"{previous_status.value} -> {new_status.value}"}
        )
        
        return history

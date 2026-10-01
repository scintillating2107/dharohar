from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: str
    record_id: str
    entity_type: str
    user_id: Optional[str] = None
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changes_summary: Optional[Dict[str, Any]] = None
    client_ip: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

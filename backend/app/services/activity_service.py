import json
from sqlalchemy.orm import Session
from ..models.activity import ActivityLog
from ..models.dataset import Dataset
from typing import Dict, Any, Optional

def log_activity(
    db: Session,
    user_id: Optional[int],
    dataset_id: Optional[int],
    dataset_filename: Optional[str],
    activity_type: str,
    status: str = "success",
    summary_metrics: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    
    # Do not log sensitive info in summary metrics
    safe_metrics = {}
    if summary_metrics:
        # Strip potentially large or sensitive data if needed, or just serialize
        safe_metrics = summary_metrics

    log_entry = ActivityLog(
        user_id=user_id,
        dataset_id=dataset_id,
        dataset_filename=dataset_filename,
        activity_type=activity_type,
        status=status,
        summary_metrics=json.dumps(safe_metrics) if safe_metrics else None
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

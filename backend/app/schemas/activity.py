from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    dataset_id: Optional[int]
    dataset_filename: Optional[str]
    activity_type: str
    status: str
    summary_metrics: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

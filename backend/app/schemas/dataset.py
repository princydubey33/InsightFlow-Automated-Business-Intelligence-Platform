from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DatasetBase(BaseModel):
    original_filename: str
    file_type: str
    file_size: int
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    status: str

class DatasetCreate(DatasetBase):
    filename: str

class DatasetResponse(DatasetBase):
    id: int
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class FixIssueRequest(BaseModel):
    issue_id: str
    issue_type: str
    column: str

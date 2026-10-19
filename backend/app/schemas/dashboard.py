from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DashboardBase(BaseModel):
    title: str = "Custom Dashboard"
    dataset_id: Optional[int] = None
    config: str # JSON string of dashboard settings, theme, visual array, filters
    is_default: bool = False

class DashboardCreate(DashboardBase):
    pass

class DashboardUpdate(BaseModel):
    title: Optional[str] = None
    dataset_id: Optional[int] = None
    config: Optional[str] = None
    is_default: Optional[bool] = None

class DashboardResponse(DashboardBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

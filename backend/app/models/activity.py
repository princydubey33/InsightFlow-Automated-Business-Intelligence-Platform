from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from ..database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    dataset_filename = Column(String, nullable=True) # Store original filename in case dataset is deleted
    activity_type = Column(String, index=True) # 'Data Quality', 'Analytics', 'Insights', 'Report', 'AI Query', 'Data Cleaning', 'Upload'
    status = Column(String, default="success")
    summary_metrics = Column(Text, nullable=True) # JSON snapshot of the result
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

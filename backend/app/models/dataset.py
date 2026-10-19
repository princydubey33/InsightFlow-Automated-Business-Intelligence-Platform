from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from ..database import Base
from datetime import datetime

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    original_filename = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    status = Column(String, default="uploaded")
    user_id = Column(Integer, nullable=True) # Adding user_id for isolation
    file_content = Column(Text, nullable=True) # Base64 encoded file content to persist across ephemeral restarts


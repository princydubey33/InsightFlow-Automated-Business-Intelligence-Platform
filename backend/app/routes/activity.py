from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..models.activity import ActivityLog
from ..models.dataset import Dataset
from ..schemas.activity import ActivityLogResponse
from ..schemas.dataset import DatasetResponse

router = APIRouter(prefix="/api/history", tags=["History"])

def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[int]:
    if x_user_id and x_user_id.isdigit():
        return int(x_user_id)
    return None

@router.get("/activities", response_model=List[ActivityLogResponse])
def get_activity_history(
    db: Session = Depends(get_db), 
    user_id: Optional[int] = Depends(get_current_user_id)
):
    query = db.query(ActivityLog)
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    
    return query.order_by(ActivityLog.created_at.desc()).all()

@router.get("/datasets", response_model=List[DatasetResponse])
def get_dataset_history(
    db: Session = Depends(get_db), 
    user_id: Optional[int] = Depends(get_current_user_id)
):
    query = db.query(Dataset)
    if user_id:
        query = query.filter(Dataset.user_id == user_id)
        
    return query.order_by(Dataset.uploaded_at.desc()).all()

@router.delete("/activities/{activity_id}")
def delete_activity_log(
    activity_id: int, 
    db: Session = Depends(get_db), 
    user_id: Optional[int] = Depends(get_current_user_id)
):
    activity = db.query(ActivityLog).filter(ActivityLog.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity log not found")
        
    if activity.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
        
    db.delete(activity)
    db.commit()
    return {"message": "Activity log deleted successfully"}

@router.delete("/activities")
def clear_activity_history(
    db: Session = Depends(get_db), 
    user_id: Optional[int] = Depends(get_current_user_id)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    db.query(ActivityLog).filter(ActivityLog.user_id == user_id).delete()
    db.commit()
    return {"message": "All activity history cleared successfully"}

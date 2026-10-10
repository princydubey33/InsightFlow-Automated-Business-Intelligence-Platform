from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json

from ..database import get_db
from ..models.dataset import Dataset
from ..schemas.dataset import DatasetResponse, FixIssueRequest
from ..schemas.ai import AskQuestionRequest, AskQuestionResponse
from ..config import settings
from ..services.analytics_service import generate_analytics
from ..services.insights_service import generate_insights
from ..services.report_service import generate_report
from ..services.ai_service import answer_dataset_question
from ..services.dataset_service import apply_fix
from ..services.activity_service import log_activity

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[int]:
    if x_user_id and x_user_id.isdigit():
        return int(x_user_id)
    return None

@router.get("", response_model=List[DatasetResponse])
def get_datasets(db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    query = db.query(Dataset)
    if user_id:
        query = query.filter(Dataset.user_id == user_id)
    return query.order_by(Dataset.uploaded_at.desc()).all()

@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dataset")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    # We do NOT delete the activity logs automatically here. We just set dataset_id to None in the logs, or let them be.
    # The requirement says: "Deleting an activity log must NOT delete the original CSV dataset or saved reports unless the user explicitly chooses a separate "Delete Dataset" action."
    # If the user deletes a dataset, what happens to history? Let's cascade delete the history logs for this dataset to keep it clean.
    from ..models.activity import ActivityLog
    db.query(ActivityLog).filter(ActivityLog.dataset_id == dataset_id).delete()
        
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset and associated history deleted successfully"}

@router.get("/{dataset_id}/quality")
def get_dataset_quality(dataset_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    report_path = f"{file_path}.quality.json"
    
    if os.path.exists(report_path):
        with open(report_path, "r") as f:
            data = json.load(f)
            log_activity(db, user_id, dataset.id, dataset.original_filename, "Data Quality", "success", {"score": data.get("quality_score")})
            return data
    else:
        raise HTTPException(status_code=404, detail="Quality report not found")

@router.get("/{dataset_id}/analytics")
def get_dataset_analytics(dataset_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    analytics = generate_analytics(file_path, dataset.file_type)
    if "error" in analytics:
        return {
            "totalRevenue": None, "totalOrders": None, "totalQuantity": None, "totalReturns": None,
            "averageOrderValue": None, "revenueByDate": [], "revenueByProduct": [], "revenueByCategory": [],
            "revenueByCity": [], "top5Products": [], "top5Categories": [], "top5Cities": [], "ordersVsReturnsByDate": []
        }
    log_activity(db, user_id, dataset.id, dataset.original_filename, "Analytics", "success", {"revenue": analytics.get("totalRevenue")})
    return analytics

@router.get("/{dataset_id}/insights")
def get_dataset_insights(dataset_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    insights = generate_insights(file_path, dataset.file_type)
    log_activity(db, user_id, dataset.id, dataset.original_filename, "Insights", "success", {"insights_generated": len(insights)})
    return insights

@router.get("/{dataset_id}/report")
def get_dataset_report(dataset_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    report = generate_report(dataset, file_path)
    # Save a snapshot of the report in the activity log
    log_activity(db, user_id, dataset.id, dataset.original_filename, "Report", "success", report)
    return report

@router.post("/{dataset_id}/ask", response_model=AskQuestionResponse)
def ask_dataset_question(dataset_id: int, request: AskQuestionRequest, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
        result = answer_dataset_question(request.question, dataset, file_path, history_dicts)
        log_activity(db, user_id, dataset.id, dataset.original_filename, "AI Query", "success", {"question": request.question})
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        log_activity(db, user_id, dataset.id, dataset.original_filename, "AI Query", "error", {"question": request.question, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Error generating AI answer: {str(e)}")

@router.post("/{dataset_id}/fix")
def fix_dataset_issue(dataset_id: int, request: FixIssueRequest, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    success = apply_fix(file_path, dataset.file_type, request.issue_id, request.issue_type, request.column)
    if not success:
        log_activity(db, user_id, dataset.id, dataset.original_filename, "Data Cleaning", "error", {"issue_type": request.issue_type})
        raise HTTPException(status_code=500, detail="Failed to apply fix to dataset")
        
    log_activity(db, user_id, dataset.id, dataset.original_filename, "Data Cleaning", "success", {"issue_type": request.issue_type})
    return {"message": f"Successfully applied fix for {request.issue_type}"}

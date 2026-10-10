from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os

from ..database import get_db
from ..models.dataset import Dataset
from ..schemas.dataset import DatasetResponse
from ..config import settings
from ..services.analytics_service import generate_analytics
from ..services.insights_service import generate_insights
from ..services.report_service import generate_report
from ..services.ai_service import answer_dataset_question
from ..schemas.ai import AskQuestionRequest, AskQuestionResponse

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

@router.get("", response_model=List[DatasetResponse])
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()

@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully"}

import json

@router.get("/{dataset_id}/quality")
def get_dataset_quality(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    report_path = f"{file_path}.quality.json"
    
    if os.path.exists(report_path):
        with open(report_path, "r") as f:
            return json.load(f)
    else:
        raise HTTPException(status_code=404, detail="Quality report not found")

@router.get("/{dataset_id}/analytics")
def get_dataset_analytics(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    analytics = generate_analytics(file_path, dataset.file_type)
    if "error" in analytics:
        # Return default structure on error
        return {
            "totalRevenue": None,
            "totalOrders": None,
            "totalQuantity": None,
            "totalReturns": None,
            "averageOrderValue": None,
            "revenueByDate": [],
            "revenueByProduct": [],
            "revenueByCategory": [],
            "revenueByCity": [],
            "top5Products": [],
            "top5Categories": [],
            "top5Cities": [],
            "ordersVsReturnsByDate": []
        }
    return analytics

@router.get("/{dataset_id}/insights")
def get_dataset_insights(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    insights = generate_insights(file_path, dataset.file_type)
    return insights

@router.get("/{dataset_id}/report")
def get_dataset_report(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    report = generate_report(dataset, file_path)
    return report

@router.post("/{dataset_id}/ask", response_model=AskQuestionResponse)
def ask_dataset_question(dataset_id: int, request: AskQuestionRequest, db: Session = Depends(get_db)):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        result = answer_dataset_question(request.question, dataset, file_path)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating AI answer: {str(e)}")

from ..schemas.dataset import FixIssueRequest
from ..services.dataset_service import apply_fix

@router.post("/{dataset_id}/fix")
def fix_dataset_issue(dataset_id: int, request: FixIssueRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = os.path.join(settings.upload_dir, dataset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    success = apply_fix(file_path, dataset.file_type, request.issue_id, request.issue_type, request.column)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to apply fix to dataset")
        
    return {"message": f"Successfully applied fix for {request.issue_type}"}

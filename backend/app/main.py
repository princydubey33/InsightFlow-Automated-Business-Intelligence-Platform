from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import uuid
import shutil

from .config import settings
from .database import engine, Base, get_db
from .models import dataset as dataset_models
from .models import user as user_models
from .models import activity as activity_models
from .routes import datasets, auth, activity
from .schemas.dataset import DatasetResponse
from .services.dataset_service import analyze_file
from .services.activity_service import log_activity
from typing import Optional
from fastapi import Header

user_models.Base.metadata.create_all(bind=engine)
dataset_models.Base.metadata.create_all(bind=engine)
activity_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the InsightFlow API! Please visit /docs for the API documentation.", "status": "active"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": settings.app_name}

ALLOWED_TYPES = [
    "text/csv", 
    "application/vnd.ms-excel", 
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/csv",
    "text/x-csv"
]

@app.post("/api/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    if file.content_type not in ALLOWED_TYPES and not file.filename.endswith(('.csv', '.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV and Excel files are allowed.")
    
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    saved_filename = f"{file_id}{ext}"
    file_path = os.path.join(settings.upload_dir, saved_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
    
    file_size = os.path.getsize(file_path)
    
    row_count, column_count = analyze_file(file_path, file.content_type)
    
    user_id = int(x_user_id) if x_user_id and x_user_id.isdigit() else None
    
    db_dataset = dataset_models.Dataset(
        filename=saved_filename,
        original_filename=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        row_count=row_count,
        column_count=column_count,
        status="processed",
        user_id=user_id
    )
    
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    
    log_activity(
        db=db,
        user_id=user_id,
        dataset_id=db_dataset.id,
        dataset_filename=db_dataset.original_filename,
        activity_type="Upload",
        status="success",
        summary_metrics={"row_count": row_count, "column_count": column_count, "file_size": file_size}
    )
    
    return db_dataset

app.include_router(datasets.router)
app.include_router(auth.router)
app.include_router(activity.router)

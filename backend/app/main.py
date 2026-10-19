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
from .models import dashboard as dashboard_models
from .routes import datasets, auth, activity, dashboards
from .schemas.dataset import DatasetResponse
from .services.dataset_service import analyze_file
from .services.activity_service import log_activity
from typing import Optional
from fastapi import Header

user_models.Base.metadata.create_all(bind=engine)
dataset_models.Base.metadata.create_all(bind=engine)
activity_models.Base.metadata.create_all(bind=engine)
dashboard_models.Base.metadata.create_all(bind=engine)

from sqlalchemy import inspect, text
def ensure_schema_migrations():
    try:
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns("users")]
            with engine.connect() as conn:
                if "reset_token" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR"))
                if "reset_token_expires" not in columns:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP WITH TIME ZONE"))
                    else:
                        conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))
                conn.commit()

        if "datasets" in inspector.get_table_names():
            ds_columns = [col["name"] for col in inspector.get_columns("datasets")]
            with engine.connect() as conn:
                if "file_content" not in ds_columns:
                    conn.execute(text("ALTER TABLE datasets ADD COLUMN file_content TEXT"))
                conn.commit()
    except Exception as e:
        print(f"Database schema migration warning: {e}")

ensure_schema_migrations()

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
    
    import base64
    try:
        content_bytes = await file.read()
        os.makedirs(settings.upload_dir, exist_ok=True)
        with open(file_path, "wb") as buffer:
            buffer.write(content_bytes)
        b64_content = base64.b64encode(content_bytes).decode("utf-8")
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
        user_id=user_id,
        file_content=b64_content
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
app.include_router(dashboards.router)

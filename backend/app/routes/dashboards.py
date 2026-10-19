from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.dashboard import Dashboard
from ..schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardResponse

router = APIRouter(prefix="/api/dashboards", tags=["Dashboards"])

def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[int]:
    if x_user_id and x_user_id.isdigit():
        return int(x_user_id)
    return None

def verify_dashboard_ownership(dashboard: Dashboard, user_id: Optional[int]):
    if user_id is None or dashboard.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access or modify this dashboard."
        )

@router.get("", response_model=List[DashboardResponse])
def get_user_dashboards(db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    if user_id is None:
        return []
    return db.query(Dashboard).filter(Dashboard.user_id == user_id).order_by(Dashboard.updated_at.desc()).all()

@router.post("", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
def create_dashboard(payload: DashboardCreate, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    effective_user_id = user_id if user_id is not None else 1
    
    # If set as default, unset other defaults for this user
    if payload.is_default:
        db.query(Dashboard).filter(Dashboard.user_id == effective_user_id).update({"is_default": False})

    new_dashboard = Dashboard(
        user_id=effective_user_id,
        title=payload.title,
        dataset_id=payload.dataset_id,
        config=payload.config,
        is_default=payload.is_default
    )
    db.add(new_dashboard)
    db.commit()
    db.refresh(new_dashboard)
    return new_dashboard

@router.get("/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(dashboard_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    verify_dashboard_ownership(dashboard, user_id)
    return dashboard

@router.put("/{dashboard_id}", response_model=DashboardResponse)
def update_dashboard(dashboard_id: int, payload: DashboardUpdate, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    verify_dashboard_ownership(dashboard, user_id)

    if payload.title is not None:
        dashboard.title = payload.title
    if payload.dataset_id is not None:
        dashboard.dataset_id = payload.dataset_id
    if payload.config is not None:
        dashboard.config = payload.config
    if payload.is_default is not None:
        if payload.is_default:
            db.query(Dashboard).filter(Dashboard.user_id == dashboard.user_id, Dashboard.id != dashboard.id).update({"is_default": False})
        dashboard.is_default = payload.is_default

    db.commit()
    db.refresh(dashboard)
    return dashboard

@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    verify_dashboard_ownership(dashboard, user_id)

    db.delete(dashboard)
    db.commit()
    return {"message": "Dashboard deleted successfully", "id": dashboard_id}

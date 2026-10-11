from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import user as models
from ..schemas import user as schemas
import hashlib

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user.password)
    # Give Admin role if email contains admin, otherwise User
    role = "Admin" if "admin" in user.email.lower() else "User"
    
    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.UserResponse)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if db_user.password != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return db_user

import secrets
from datetime import datetime, timedelta, timezone
from ..config import settings
from ..services.email_service import send_reset_email

@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    db_user = db.query(models.User).filter(models.User.email.ilike(email_clean)).first()
    
    if not db_user:
        # Prevent email enumeration while returning informative response
        return {"message": f"If an account exists for {req.email}, reset instructions have been sent."}
    
    # Generate cryptographically secure token
    raw_token = secrets.token_urlsafe(32)
    hashed_token = hash_password(raw_token)
    
    # Set expiration to 1 hour from now (UTC)
    now_utc = datetime.now(timezone.utc)
    db_user.reset_token = hashed_token
    db_user.reset_token_expires = now_utc + timedelta(hours=1)
    db.commit()
    
    # Send email to the actual user who requested the reset
    frontend_base = settings.frontend_url.rstrip("/")
    reset_link = f"{frontend_base}/reset-password?token={raw_token}&email={db_user.email}"
    success = send_reset_email(db_user.email, reset_link)
    
    if not success:
        # Clear token if email failed
        db_user.reset_token = None
        db_user.reset_token_expires = None
        db.commit()
        raise HTTPException(
            status_code=500, 
            detail="Failed to send password reset email. Please ensure SMTP configuration is configured in the server environment."
        )
        
    return {"message": f"Password reset instructions sent to {db_user.email}."}

@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    if not req.token or not req.new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    hashed_token = hash_password(req.token)
    
    db_user = db.query(models.User).filter(models.User.reset_token == hashed_token).first()
    
    if not db_user or not db_user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    # Robust timezone comparison (handles both SQLite timezone-naive and timezone-aware datetimes)
    expires = db_user.reset_token_expires
    if expires.tzinfo is not None:
        now = datetime.now(timezone.utc)
    else:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
    if expires < now:
        # Invalidate expired token
        db_user.reset_token = None
        db_user.reset_token_expires = None
        db.commit()
        raise HTTPException(status_code=400, detail="Reset token has expired.")
    
    # Update password and clear token (single use)
    db_user.password = hash_password(req.new_password)
    db_user.reset_token = None
    db_user.reset_token_expires = None
    db.commit()
    
    return {"message": "Password has been reset successfully."}

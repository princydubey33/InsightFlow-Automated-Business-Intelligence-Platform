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
from datetime import datetime, timedelta
from ..config import settings
from ..services.email_service import send_reset_email

@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == req.email).first()
    
    if not db_user:
        # Return success even if user not found to prevent email enumeration
        return {"message": "If that email is in our system, we have sent a reset link."}
    
    # Generate cryptographically secure token
    raw_token = secrets.token_urlsafe(32)
    hashed_token = hash_password(raw_token)
    
    # Set expiration to 1 hour from now
    db_user.reset_token = hashed_token
    from datetime import timezone
    db_user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    
    # Send email
    reset_link = f"{settings.frontend_url}/reset-password?token={raw_token}&email={req.email}"
    success = send_reset_email(req.email, reset_link)
    
    if not success:
        # Clear token if email failed
        db_user.reset_token = None
        db_user.reset_token_expires = None
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to send email. Please ensure SMTP configuration is correct in the server environment.")
        
    return {"message": "Password reset instructions sent to your email."}

@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    hashed_token = hash_password(req.token)
    
    db_user = db.query(models.User).filter(models.User.reset_token == hashed_token).first()
    
    from datetime import timezone
    now = datetime.now(timezone.utc)
    
    if not db_user or not db_user.reset_token_expires or db_user.reset_token_expires < now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    # Update password and clear token
    db_user.password = hash_password(req.new_password)
    db_user.reset_token = None
    db_user.reset_token_expires = None
    db.commit()
    
    return {"message": "Password has been reset successfully."}

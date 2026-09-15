"""
YatraSaarthi API v1 - Authentication Endpoints
Registration, login, profile. JWT-based authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.models.models import User, UserSetting
from app.schemas.schemas import UserRegister, UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_current_user(db: Session = Depends(get_db), token: str = None) -> User:
    """Dependency to get current authenticated user."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create default settings
    settings = UserSetting(user_id=user.id)
    db.add(settings)
    db.commit()
    
    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email,
            full_name=user.full_name, is_active=user.is_active,
            created_at=user.created_at
        )
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email,
            full_name=user.full_name, is_active=user.is_active,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
def get_profile(token: str = "", db: Session = Depends(get_db)):
    """Get current user profile."""
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id, email=user.email,
        full_name=user.full_name, is_active=user.is_active,
        created_at=user.created_at
    )

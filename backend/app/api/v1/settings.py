"""
YatraSaarthi API v1 - Settings Endpoints
User settings CRUD.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import UserSetting
from app.schemas.schemas import UserSettingsRequest, UserSettingsResponse

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/{user_id}", response_model=UserSettingsResponse)
def get_settings(user_id: int, db: Session = Depends(get_db)):
    """Get user settings."""
    settings = db.query(UserSetting).filter(UserSetting.user_id == user_id).first()
    if not settings:
        # Create default settings
        settings = UserSetting(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return UserSettingsResponse(
        user_id=settings.user_id,
        distance_unit=settings.distance_unit,
        speed_unit=settings.speed_unit,
        voice_guidance=settings.voice_guidance,
        auto_tunnel_mode=settings.auto_tunnel_mode,
        high_accuracy_mode=settings.high_accuracy_mode,
        sensor_fusion_enabled=settings.sensor_fusion_enabled,
        vehicle_type=settings.vehicle_type,
        theme=settings.theme
    )


@router.put("/{user_id}", response_model=UserSettingsResponse)
def update_settings(user_id: int, data: UserSettingsRequest, db: Session = Depends(get_db)):
    """Update user settings."""
    settings = db.query(UserSetting).filter(UserSetting.user_id == user_id).first()
    if not settings:
        settings = UserSetting(user_id=user_id)
        db.add(settings)
    
    settings.distance_unit = data.distance_unit
    settings.speed_unit = data.speed_unit
    settings.voice_guidance = data.voice_guidance
    settings.auto_tunnel_mode = data.auto_tunnel_mode
    settings.high_accuracy_mode = data.high_accuracy_mode
    settings.sensor_fusion_enabled = data.sensor_fusion_enabled
    settings.vehicle_type = data.vehicle_type
    settings.theme = data.theme
    
    db.commit()
    db.refresh(settings)
    
    return UserSettingsResponse(
        user_id=settings.user_id,
        distance_unit=settings.distance_unit,
        speed_unit=settings.speed_unit,
        voice_guidance=settings.voice_guidance,
        auto_tunnel_mode=settings.auto_tunnel_mode,
        high_accuracy_mode=settings.high_accuracy_mode,
        sensor_fusion_enabled=settings.sensor_fusion_enabled,
        vehicle_type=settings.vehicle_type,
        theme=settings.theme
    )

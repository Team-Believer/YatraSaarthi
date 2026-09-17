"""
YatraSaarthi API v1 - AI/ML Model Endpoints
Exposes real diagnostic and inference metrics for E5 and U2 models.
"""
from fastapi import APIRouter
from app.ml.inference.manager import ml_manager

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.get("/status")
def get_ml_status():
    """
    Get real-time loading and diagnostic status of E5 velocity
    and U2 uncertainty models.
    """
    return ml_manager.get_status()

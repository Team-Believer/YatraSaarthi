"""
YatraSaarthi API v1 - IDR Engine State Router
Provides current IDR engine diagnostic state.
"""
from fastapi import APIRouter
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/idr", tags=["IDR Engine"])


@router.get("/state")
def get_idr_state():
    """Get active IDR Engine instances state."""
    sessions = ws_manager.get_active_sessions()
    return {
        "engine": "InEKF Lie-Group IDR",
        "active_engine_count": len(sessions),
        "active_sessions": sessions,
        "mode": "LIVE"
    }

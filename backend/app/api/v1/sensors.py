"""
YatraSaarthi API v1 - Sensors Router
Provides sensor status diagnostics.
"""
from fastapi import APIRouter
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/sensors", tags=["Sensors"])


@router.get("/status")
@router.get("/diagnostics")
def get_sensor_status():
    """Get active sensor system status and active sessions."""
    return {
        "status": "LIVE",
        "active_sessions": ws_manager.get_active_sessions(),
        "supported_sensors": ["geolocation", "accelerometer", "gyroscope", "magnetometer"],
        "mode": "LIVE - Real Sensor Streaming Only"
    }

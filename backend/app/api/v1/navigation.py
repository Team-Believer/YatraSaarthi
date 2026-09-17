"""
YatraSaarthi API v1 - Navigation Session Endpoints
Start/stop sessions, session status, active sessions.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import NavigationSession, NavigationPoint
from app.schemas.schemas import StartSessionRequest, SessionResponse, StopSessionRequest, EndSessionResponse
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/navigation", tags=["Navigation"])


@router.post("/session", response_model=SessionResponse)
@router.post("/sessions/start", response_model=SessionResponse)
def start_session(data: StartSessionRequest, db: Session = Depends(get_db)):
    """Create a new navigation session."""
    session_id = str(uuid.uuid4())
    session = NavigationSession(
        id=session_id,
        vehicle_type=data.vehicle_type,
        is_active=True
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SessionResponse(
        session_id=session.id,
        start_time=session.start_time,
        is_active=session.is_active,
        vehicle_type=session.vehicle_type,
        navigation_mode=session.navigation_mode
    )


@router.get("/session/{session_id}", response_model=SessionResponse)
@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get navigation session status."""
    session = db.query(NavigationSession).filter(NavigationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionResponse(
        session_id=session.id,
        start_time=session.start_time,
        is_active=session.is_active,
        vehicle_type=session.vehicle_type,
        navigation_mode=session.navigation_mode
    )


def _terminate_session(session_id: str, db: Session) -> EndSessionResponse:
    """Internal helper to safely and idempotently end a navigation session."""
    session = db.query(NavigationSession).filter(NavigationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # If session is already completed, return existing summary idempotently
    if not session.is_active:
        return EndSessionResponse(
            session_id=session.id,
            status="COMPLETED",
            ended_at=session.end_time,
            distance_m=round(session.distance_meters, 1) if session.distance_meters and session.distance_meters > 0 else None,
            duration_s=round(session.duration_seconds, 1) if session.duration_seconds is not None else None,
            start_lat=session.start_lat,
            start_lon=session.start_lon,
            end_lat=session.end_lat,
            end_lon=session.end_lon,
        )
    
    # Extract actual recorded points and distance from active engine if available
    summary = ws_manager.get_session_summary(session_id)
    if summary:
        if summary.get("distance_m") is not None:
            session.distance_meters = summary["distance_m"]
        if summary.get("start_lat") is not None:
            session.start_lat = summary["start_lat"]
        if summary.get("start_lon") is not None:
            session.start_lon = summary["start_lon"]
        if summary.get("end_lat") is not None:
            session.end_lat = summary["end_lat"]
        if summary.get("end_lon") is not None:
            session.end_lon = summary["end_lon"]
            
        # Persist points to SQLite NavigationPoint table
        for pt_dict in summary.get("points", []):
            point = NavigationPoint(
                session_id=session_id,
                latitude=pt_dict["latitude"],
                longitude=pt_dict["longitude"],
                altitude=pt_dict.get("altitude"),
                speed=pt_dict.get("speed", 0.0),
                heading=pt_dict.get("heading", 0.0),
                horizontal_accuracy=pt_dict.get("horizontal_accuracy", 0.0),
                position_confidence=pt_dict.get("position_confidence", 1.0),
                navigation_mode=pt_dict.get("navigation_mode", "GNSS_AIDED"),
                timestamp=datetime.fromtimestamp(pt_dict["timestamp"], tz=timezone.utc) if pt_dict.get("timestamp") else datetime.now(timezone.utc),
            )
            db.add(point)

    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    
    if session.start_time:
        # Normalize both start and end to aware UTC datetimes to prevent naive vs aware TypeErrors
        start_t = session.start_time.replace(tzinfo=timezone.utc) if session.start_time.tzinfo is None else session.start_time
        end_t = session.end_time.replace(tzinfo=timezone.utc) if (session.end_time and session.end_time.tzinfo is None) else (session.end_time or datetime.now(timezone.utc))
        session.duration_seconds = max(0.0, (end_t - start_t).total_seconds())
    
    db.commit()
    db.refresh(session)
    
    # Disconnect in ws_manager
    ws_manager.disconnect(session_id)
    
    return EndSessionResponse(
        session_id=session.id,
        status="COMPLETED",
        ended_at=session.end_time,
        distance_m=round(session.distance_meters, 1) if session.distance_meters and session.distance_meters > 0 else None,
        duration_s=round(session.duration_seconds, 1) if session.duration_seconds is not None else None,
        start_lat=session.start_lat,
        start_lon=session.start_lon,
        end_lat=session.end_lat,
        end_lon=session.end_lon,
    )


@router.post("/session/{session_id}/end", response_model=EndSessionResponse)
@router.post("/sessions/{session_id}/end", response_model=EndSessionResponse)
def end_session_by_id(session_id: str, db: Session = Depends(get_db)):
    """End an active navigation session by session_id in URL path."""
    return _terminate_session(session_id, db)


@router.post("/sessions/stop", response_model=EndSessionResponse)
def stop_session(data: StopSessionRequest, db: Session = Depends(get_db)):
    """Stop an active navigation session with JSON payload (backward compatibility)."""
    return _terminate_session(data.session_id, db)


@router.get("/sessions/active")
def get_active_sessions():
    """Get all active WebSocket sessions."""
    return {"sessions": ws_manager.get_active_sessions()}


@router.get("/sessions/{session_id}/diagnostics")
def get_session_diagnostics(session_id: str):
    """Get IDR engine diagnostics for an active session."""
    diag = ws_manager.get_diagnostics(session_id)
    if not diag:
        raise HTTPException(status_code=404, detail="No active engine for this session")
    return diag


@router.get("/ml/status")
def get_navigation_ml_status():
    """Get real-time AI/ML model status and diagnostics."""
    from app.ml.inference.manager import ml_manager
    return ml_manager.get_status()


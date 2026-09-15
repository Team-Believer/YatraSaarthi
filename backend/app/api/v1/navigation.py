"""
YatraSaarthi API v1 - Navigation Session Endpoints
Start/stop sessions, session status, active sessions.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import NavigationSession
from app.schemas.schemas import StartSessionRequest, SessionResponse, StopSessionRequest
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/navigation", tags=["Navigation"])


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


@router.post("/sessions/stop")
def stop_session(data: StopSessionRequest, db: Session = Depends(get_db)):
    """Stop an active navigation session."""
    session = db.query(NavigationSession).filter(NavigationSession.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    
    if session.start_time:
        session.duration_seconds = (session.end_time - session.start_time).total_seconds()
    
    db.commit()
    
    return {"status": "stopped", "session_id": data.session_id}


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

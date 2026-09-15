"""
YatraSaarthi API v1 - History Endpoints
Retrieve recorded navigation sessions and trajectory details.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.models import NavigationSession, NavigationPoint
from app.schemas.schemas import SessionSummary, SessionDetail

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/sessions", response_model=List[SessionSummary])
def list_sessions(limit: int = 50, db: Session = Depends(get_db)):
    """List recorded navigation sessions, most recent first."""
    sessions = (
        db.query(NavigationSession)
        .filter(NavigationSession.is_active == False)
        .order_by(NavigationSession.start_time.desc())
        .limit(limit)
        .all()
    )
    return [
        SessionSummary(
            session_id=s.id,
            start_time=s.start_time,
            end_time=s.end_time,
            distance_meters=s.distance_meters,
            duration_seconds=s.duration_seconds,
            vehicle_type=s.vehicle_type,
            start_lat=s.start_lat,
            start_lon=s.start_lon,
            end_lat=s.end_lat,
            end_lon=s.end_lon
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session_detail(session_id: str, db: Session = Depends(get_db)):
    """Get detailed session with trajectory points."""
    session = db.query(NavigationSession).filter(NavigationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    points = (
        db.query(NavigationPoint)
        .filter(NavigationPoint.session_id == session_id)
        .order_by(NavigationPoint.timestamp)
        .all()
    )
    
    points_data = [
        {
            "timestamp": p.timestamp.isoformat() if p.timestamp else None,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "altitude": p.altitude,
            "speed": p.speed,
            "heading": p.heading,
            "accuracy": p.horizontal_accuracy,
            "confidence": p.position_confidence,
            "mode": p.navigation_mode,
        }
        for p in points
    ]
    
    # Compute navigation modes used
    modes_used = list(set(p.navigation_mode for p in points if p.navigation_mode))
    
    return SessionDetail(
        session_id=session.id,
        start_time=session.start_time,
        end_time=session.end_time,
        distance_meters=session.distance_meters,
        duration_seconds=session.duration_seconds,
        vehicle_type=session.vehicle_type,
        start_lat=session.start_lat,
        start_lon=session.start_lon,
        end_lat=session.end_lat,
        end_lon=session.end_lon,
        points=points_data,
        navigation_modes_used=modes_used
    )


@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    """Get navigation learning insights calculated from stored journey history."""
    sessions = db.query(NavigationSession).filter(NavigationSession.is_active == False).all()
    
    total_sessions = len(sessions)
    total_distance_m = sum(s.distance_meters or 0 for s in sessions)
    total_duration_s = sum(s.duration_seconds or 0 for s in sessions)
    
    # Mode distribution
    mode_counts = {}
    points = db.query(NavigationPoint).all()
    for p in points:
        m = p.navigation_mode or "UNKNOWN"
        mode_counts[m] = mode_counts.get(m, 0) + 1
        
    return {
        "total_sessions": total_sessions,
        "total_distance_km": round(total_distance_m / 1000.0, 2),
        "total_duration_minutes": round(total_duration_s / 60.0, 1),
        "points_processed": len(points),
        "mode_distribution": mode_counts,
        "has_data": total_sessions > 0
    }


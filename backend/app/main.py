"""
YatraSaarthi - FastAPI Application Entry Point

Single integrated application. No microservices. No Docker.
Real sensor data pipeline. No simulation/demo mode.

Startup:
1. Creates SQLite database and tables
2. Registers API routers
3. Sets up WebSocket endpoint for real-time navigation
"""
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.models.models import (
    User, NavigationSession, NavigationPoint, SensorSample,
    SensorHealth, GNSSObservation, DeadReckoningState,
    MapMatchResult, Route, RoutePoint, Alert, UserSetting, SavedPlace
)
from app.api.v1 import auth, navigation, history, settings as settings_api, routes, sensors, idr, ml
from app.websocket.manager import ws_manager
from app.ml.inference.manager import ml_manager

# Track uptime
_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database and load AI/ML models on startup."""
    print(f"[YatraSaarthi] Starting application...")
    print(f"[YatraSaarthi] Database: {settings.DATABASE_URL}")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print(f"[YatraSaarthi] Database tables created.")

    # Load production AI/ML models (E5 & U2)
    ml_manager.load_models()
    
    print(f"[YatraSaarthi] Application ready. No demo/simulation mode.")
    
    yield
    
    print(f"[YatraSaarthi] Shutting down...")


app = FastAPI(
    title="YatraSaarthi API",
    description="Intelligent Dead Reckoning Navigation Platform - Beyond GPS. Always With You.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(navigation.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(settings_api.router, prefix="/api/v1")
app.include_router(routes.router, prefix="/api/v1")
app.include_router(sensors.router, prefix="/api/v1")
app.include_router(idr.router, prefix="/api/v1")
app.include_router(ml.router, prefix="/api/v1")



@app.get("/")
def root():
    return {
        "application": "YatraSaarthi",
        "tagline": "Beyond GPS. Always With You.",
        "version": "1.0.0",
        "mode": "LIVE (no simulation/demo)",
        "api_docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    from app.db.session import SessionLocal
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(Base.metadata.tables["users"].select().limit(1))
        db.close()
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "ai_ml": ml_manager.get_status(),
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "mode": "LIVE",
    }


@app.get("/api/v1/diagnostics/system")
def system_diagnostics():
    """System-wide diagnostics."""
    return {
        "active_sessions": ws_manager.get_active_sessions(),
        "uptime_seconds": round(time.time() - _start_time, 1),
        "mode": "LIVE - Real sensor data only",
    }


# ========== WebSocket Endpoint ==========
@app.websocket("/ws/navigation/{session_id}")
async def websocket_navigation(
    websocket: WebSocket,
    session_id: str,
    vehicle_type: str = Query(default="CAR")
):
    """
    Bidirectional WebSocket for real-time navigation.
    
    Frontend sends: Raw sensor data packets (GNSS, IMU, Orientation)
    Backend sends: Fused navigation state from IDR engine
    
    No fake data is injected at any point in this pipeline.
    """
    session = await ws_manager.connect(websocket, session_id, vehicle_type)
    await ws_manager.handle_session(session)

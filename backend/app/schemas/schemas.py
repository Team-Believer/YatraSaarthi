"""
YatraSaarthi - Pydantic Schemas
Request/response models for all API endpoints.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ========== Auth Schemas ==========
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str = ""

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ========== Navigation Schemas ==========
class StartSessionRequest(BaseModel):
    vehicle_type: str = "CAR"

class SessionResponse(BaseModel):
    session_id: str
    user_id: Optional[int] = None
    start_time: Optional[datetime] = None
    is_active: bool = True
    vehicle_type: str = "CAR"
    navigation_mode: str = "GNSS_AIDED"

class StopSessionRequest(BaseModel):
    session_id: str

class EndSessionResponse(BaseModel):
    session_id: str
    status: str = "COMPLETED"
    ended_at: Optional[datetime] = None
    distance_m: Optional[float] = None
    duration_s: Optional[float] = None
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None


# ========== Sensor Data Schemas (WebSocket incoming) ==========
class SensorPacket(BaseModel):
    """Validated sensor data packet from frontend."""
    type: str  # "imu", "gnss", "orientation", "combined"
    timestamp: float
    seq_num: int = 0
    
    # GNSS data
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    
    # IMU data
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None
    
    # Orientation data
    alpha: Optional[float] = None  # compass heading
    beta: Optional[float] = None   # front-back tilt
    gamma: Optional[float] = None  # left-right tilt
    
    # Sensor capabilities
    capabilities: Optional[Dict[str, bool]] = None


# ========== Navigation State Schema (WebSocket outgoing) ==========
class NavigationStateResponse(BaseModel):
    timestamp: float
    latitude: float
    longitude: float
    altitude: float
    speed: float
    heading: float
    horizontal_accuracy: float
    position_confidence: float
    heading_confidence: float
    map_confidence: float
    gnss_available: bool
    gnss_quality: str
    navigation_mode: str
    environment_state: str
    alignment_status: str
    velocity_north: float
    velocity_east: float
    velocity_down: float
    roll: float
    pitch: float
    yaw: float
    accel_bias: List[float]
    gyro_bias: List[float]
    covariance_trace: float
    innovation_norm: float
    nhc_active: bool
    zupt_active: bool
    map_matching_active: bool
    imu_available: bool
    orientation_available: bool
    gnss_outage_duration: float
    sensor_states: Dict[str, Any] = {}


# ========== History Schemas ==========
class SessionSummary(BaseModel):
    session_id: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    distance_meters: float = 0.0
    duration_seconds: float = 0.0
    vehicle_type: str = "CAR"
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None

class SessionDetail(SessionSummary):
    points: List[Dict[str, Any]] = []
    sensor_health_summary: Dict[str, Any] = {}
    navigation_modes_used: List[str] = []


# ========== Settings Schemas ==========
class UserSettingsRequest(BaseModel):
    distance_unit: str = "km"
    speed_unit: str = "km/h"
    voice_guidance: bool = True
    auto_tunnel_mode: bool = True
    high_accuracy_mode: bool = True
    sensor_fusion_enabled: bool = True
    vehicle_type: str = "CAR"
    theme: str = "light"

class UserSettingsResponse(UserSettingsRequest):
    user_id: int


# ========== Diagnostics Schemas ==========
class SensorDiagnosticsResponse(BaseModel):
    sensors: Dict[str, Dict[str, Any]]
    anomalies: List[Dict[str, Any]]
    ml_models: Dict[str, Any]
    idr_engine: Dict[str, Any]


# ========== Health Check ==========
class HealthResponse(BaseModel):
    status: str
    database: str
    version: str = "1.0.0"
    uptime_seconds: float = 0.0

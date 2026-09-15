from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    sessions = relationship("NavigationSession", back_populates="user")
    settings = relationship("UserSetting", back_populates="user", uselist=False)
    saved_places = relationship("SavedPlace", back_populates="user")

class NavigationSession(Base):
    __tablename__ = "navigation_sessions"
    
    id = Column(String, primary_key=True, index=True)  # UUID string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    start_time = Column(DateTime, default=utc_now)
    end_time = Column(DateTime, nullable=True)
    start_lat = Column(Float, nullable=True)
    start_lon = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lon = Column(Float, nullable=True)
    distance_meters = Column(Float, default=0.0)
    duration_seconds = Column(Float, default=0.0)
    navigation_mode = Column(String, default="GNSS_AIDED")
    vehicle_type = Column(String, default="CAR")
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="sessions")
    points = relationship("NavigationPoint", back_populates="session", cascade="all, delete-orphan")
    sensor_samples = relationship("SensorSample", back_populates="session", cascade="all, delete-orphan")
    sensor_healths = relationship("SensorHealth", back_populates="session", cascade="all, delete-orphan")
    gnss_observations = relationship("GNSSObservation", back_populates="session", cascade="all, delete-orphan")
    dr_states = relationship("DeadReckoningState", back_populates="session", cascade="all, delete-orphan")
    map_matches = relationship("MapMatchResult", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")

class NavigationPoint(Base):
    __tablename__ = "navigation_points"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=True)
    speed = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    horizontal_accuracy = Column(Float, default=0.0)
    position_confidence = Column(Float, default=1.0)
    heading_confidence = Column(Float, default=1.0)
    map_confidence = Column(Float, default=1.0)
    navigation_mode = Column(String, default="GNSS_AIDED")
    is_gnss = Column(Boolean, default=True)
    
    session = relationship("NavigationSession", back_populates="points")

class SensorSample(Base):
    __tablename__ = "sensor_samples"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    seq_num = Column(Integer, default=0)
    accel_x = Column(Float, nullable=True)
    accel_y = Column(Float, nullable=True)
    accel_z = Column(Float, nullable=True)
    gyro_x = Column(Float, nullable=True)
    gyro_y = Column(Float, nullable=True)
    gyro_z = Column(Float, nullable=True)
    mag_alpha = Column(Float, nullable=True)
    mag_beta = Column(Float, nullable=True)
    mag_gamma = Column(Float, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    gps_alt = Column(Float, nullable=True)
    gps_accuracy = Column(Float, nullable=True)
    gps_speed = Column(Float, nullable=True)
    gps_heading = Column(Float, nullable=True)
    
    session = relationship("NavigationSession", back_populates="sensor_samples")

class SensorHealth(Base):
    __tablename__ = "sensor_health_records"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    sensor_name = Column(String, nullable=False)  # 'accelerometer', 'gyroscope', 'orientation', 'gnss'
    status = Column(String, default="LIVE")  # LIVE, DEGRADED, UNAVAILABLE, PERMISSION_REQUIRED, ERROR
    update_rate = Column(Float, default=0.0)  # in Hz
    missing_samples = Column(Integer, default=0)
    anomaly_flag = Column(Boolean, default=False)
    
    session = relationship("NavigationSession", back_populates="sensor_healths")

class GNSSObservation(Base):
    __tablename__ = "gnss_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    alt = Column(Float, nullable=True)
    accuracy = Column(Float, default=5.0)
    speed = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    innovation = Column(Float, default=0.0)
    quality_score = Column(Float, default=1.0)
    
    session = relationship("NavigationSession", back_populates="gnss_observations")

class DeadReckoningState(Base):
    __tablename__ = "dead_reckoning_states"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    alt = Column(Float, nullable=True)
    vx = Column(Float, default=0.0)
    vy = Column(Float, default=0.0)
    vz = Column(Float, default=0.0)
    roll = Column(Float, default=0.0)
    pitch = Column(Float, default=0.0)
    yaw = Column(Float, default=0.0)
    accel_bias_x = Column(Float, default=0.0)
    accel_bias_y = Column(Float, default=0.0)
    accel_bias_z = Column(Float, default=0.0)
    gyro_bias_x = Column(Float, default=0.0)
    gyro_bias_y = Column(Float, default=0.0)
    gyro_bias_z = Column(Float, default=0.0)
    covariance_trace = Column(Float, default=0.0)
    
    session = relationship("NavigationSession", back_populates="dr_states")

class MapMatchResult(Base):
    __tablename__ = "map_match_results"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    raw_lat = Column(Float, nullable=False)
    raw_lon = Column(Float, nullable=False)
    matched_lat = Column(Float, nullable=False)
    matched_lon = Column(Float, nullable=False)
    road_name = Column(String, nullable=True)
    road_bearing = Column(Float, nullable=True)
    map_confidence = Column(Float, default=1.0)
    distance_to_edge = Column(Float, default=0.0)
    
    session = relationship("NavigationSession", back_populates="map_matches")

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(String, primary_key=True, index=True)  # UUID string
    session_id = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lon = Column(Float, nullable=False)
    total_distance_m = Column(Float, default=0.0)
    total_duration_s = Column(Float, default=0.0)
    polyline_geometry = Column(Text, default="[]")  # JSON coordinates string [[lon, lat], ...]
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=utc_now)
    
    points = relationship("RoutePoint", back_populates="route", cascade="all, delete-orphan")

class RoutePoint(Base):
    __tablename__ = "route_points"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String, ForeignKey("routes.id"), index=True, nullable=False)
    sequence = Column(Integer, default=0)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    step_instruction = Column(String, nullable=True)
    distance_to_next = Column(Float, default=0.0)
    
    route = relationship("Route", back_populates="points")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("navigation_sessions.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    alert_type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    severity = Column(String, default="INFO")  # INFO, WARNING, CRITICAL
    
    session = relationship("NavigationSession", back_populates="alerts")

class UserSetting(Base):
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    distance_unit = Column(String, default="km")
    speed_unit = Column(String, default="km/h")
    voice_guidance = Column(Boolean, default=True)
    auto_tunnel_mode = Column(Boolean, default=True)
    high_accuracy_mode = Column(Boolean, default=True)
    sensor_fusion_enabled = Column(Boolean, default=True)
    offline_map_pref = Column(Boolean, default=False)
    theme = Column(String, default="light")
    language = Column(String, default="en")
    vehicle_type = Column(String, default="CAR")
    
    user = relationship("User", back_populates="settings")

class SavedPlace(Base):
    __tablename__ = "saved_places"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    label = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=True)
    icon = Column(String, default="map-pin")
    
    user = relationship("User", back_populates="saved_places")

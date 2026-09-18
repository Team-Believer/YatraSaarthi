"""
YatraSaarthi IDR Engine - Navigation State
Mathematical state vector for the Invariant EKF.
Position (WGS84 + local NED), velocity, attitude (quaternion), IMU biases, covariance.
"""
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
import time
from app.idr.enums import NavigationMode, EnvironmentState, AlignmentStatus, GNSSQuality

@dataclass
class IMUMeasurement:
    """A single validated IMU measurement from the browser/device."""
    timestamp: float  # Unix seconds (high-resolution)
    accel_x: float = 0.0  # m/s^2 in phone body frame
    accel_y: float = 0.0
    accel_z: float = 0.0
    gyro_x: float = 0.0  # rad/s in phone body frame
    gyro_y: float = 0.0
    gyro_z: float = 0.0
    seq_num: int = 0

    @property
    def accel(self) -> np.ndarray:
        return np.array([self.accel_x, self.accel_y, self.accel_z])

    @property
    def gyro(self) -> np.ndarray:
        return np.array([self.gyro_x, self.gyro_y, self.gyro_z])

@dataclass
class GNSSMeasurement:
    """A single validated GNSS measurement from browser geolocation API."""
    timestamp: float
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    accuracy: float = 50.0  # meters
    speed: Optional[float] = None  # m/s
    heading: Optional[float] = None  # degrees
    
@dataclass
class OrientationMeasurement:
    """Device orientation from DeviceOrientationEvent."""
    timestamp: float
    alpha: Optional[float] = None  # Compass heading (degrees) 0-360
    beta: Optional[float] = None   # Front-back tilt (degrees) -180 to 180
    gamma: Optional[float] = None  # Left-right tilt (degrees) -90 to 90

@dataclass
class NavigationState:
    """
    The complete fused navigation state produced by the IDR engine.
    Every field is REAL - computed from actual sensor measurements.
    No fabricated values are ever placed here.
    """
    timestamp: float = field(default_factory=time.time)
    
    # Position (WGS84)
    latitude: float = 0.0
    longitude: float = 0.0
    altitude: float = 0.0
    
    # Velocity (NED frame, m/s)
    velocity_north: float = 0.0
    velocity_east: float = 0.0
    velocity_down: float = 0.0
    
    # Attitude (Euler angles, radians)
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0  # Heading
    
    # Speed and heading (derived)
    speed: float = 0.0  # m/s horizontal
    heading_deg: float = 0.0  # degrees, 0=North, clockwise
    
    # IMU biases (estimated by InEKF)
    accel_bias: np.ndarray = field(default_factory=lambda: np.zeros(3))
    gyro_bias: np.ndarray = field(default_factory=lambda: np.zeros(3))
    
    # Covariance (15x15 error state)
    covariance: np.ndarray = field(default_factory=lambda: np.eye(15) * 100.0)
    
    # Confidence metrics (computed, never fabricated)
    horizontal_accuracy: float = 100.0  # meters
    position_confidence: float = 0.0
    heading_confidence: float = 0.0
    map_confidence: float = 0.0
    
    # State machine
    navigation_mode: NavigationMode = NavigationMode.GNSS_AIDED
    environment_state: EnvironmentState = EnvironmentState.UNKNOWN
    alignment_status: AlignmentStatus = AlignmentStatus.UNALIGNED
    gnss_quality: GNSSQuality = GNSSQuality.LOST
    
    # GNSS tracking
    gnss_available: bool = False
    last_gnss_time: Optional[float] = None
    gnss_outage_duration: float = 0.0
    
    # Sensor states
    imu_available: bool = False
    orientation_available: bool = False
    
    # Filter diagnostics
    innovation_norm: float = 0.0
    nhc_active: bool = False
    zupt_active: bool = False
    map_matching_active: bool = False

    # AI/ML Model Telemetry
    ai_model_ready: bool = False
    ai_selected_model: str = "E5"
    ai_model_status: str = "PRODUCTION / VALIDATED"
    ai_velocity: Optional[float] = None
    ai_uncertainty_sigma: Optional[float] = None
    ai_variance: Optional[float] = None
    ai_inference_latency_ms: Optional[float] = None
    ai_window_fill_pct: float = 0.0
    ai_total_inferences: int = 0
    
    def to_dict(self) -> dict:
        """Serialize for WebSocket transmission."""
        return {
            "timestamp": self.timestamp,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "speed": self.speed,
            "heading": self.heading_deg,
            "horizontal_accuracy": self.horizontal_accuracy,
            "position_confidence": self.position_confidence,
            "heading_confidence": self.heading_confidence,
            "map_confidence": self.map_confidence,
            "gnss_available": self.gnss_available,
            "gnss_quality": self.gnss_quality.value,
            "navigation_mode": self.navigation_mode.value,
            "environment_state": self.environment_state.value,
            "alignment_status": self.alignment_status.value,
            "velocity_north": self.velocity_north,
            "velocity_east": self.velocity_east,
            "velocity_down": self.velocity_down,
            "roll": float(np.degrees(self.roll)),
            "pitch": float(np.degrees(self.pitch)),
            "yaw": float(np.degrees(self.yaw)),
            "accel_bias": self.accel_bias.tolist(),
            "gyro_bias": self.gyro_bias.tolist(),
            "covariance_trace": float(np.trace(self.covariance)),
            "innovation_norm": self.innovation_norm,
            "nhc_active": self.nhc_active,
            "zupt_active": self.zupt_active,
            "map_matching_active": self.map_matching_active,
            "imu_available": self.imu_available,
            "orientation_available": self.orientation_available,
            "gnss_outage_duration": self.gnss_outage_duration,
            "last_gnss_time": self.last_gnss_time,
            "ai_model_ready": self.ai_model_ready,
            "ai_selected_model": self.ai_selected_model,
            "ai_model_status": self.ai_model_status,
            "ai_velocity": self.ai_velocity,
            "ai_uncertainty_sigma": self.ai_uncertainty_sigma,
            "ai_variance": self.ai_variance,
            "ai_inference_latency_ms": self.ai_inference_latency_ms,
            "ai_window_fill_pct": round(self.ai_window_fill_pct, 1),
            "ai_total_inferences": self.ai_total_inferences,
            "sensor_states": {}  # Populated by session manager
        }

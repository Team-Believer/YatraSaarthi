"""
YatraSaarthi IDR Engine - Strapdown INS Mechanization

Implements proper inertial navigation propagation:
- Quaternion attitude integration from gyroscope
- Specific force transformation from body to navigation frame
- Gravity compensation
- Velocity and position integration
- WGS84 geodesic position update

No fake position updates. All outputs derived from actual IMU measurements.
"""
import numpy as np
from typing import Optional
from app.idr.state import IMUMeasurement, NavigationState

# WGS84 constants
WGS84_A = 6378137.0  # Semi-major axis (m)
WGS84_F = 1.0 / 298.257223563  # Flattening
WGS84_E2 = 2 * WGS84_F - WGS84_F ** 2  # Eccentricity squared
GRAVITY = 9.80665  # Standard gravity (m/s^2)


def euler_to_quaternion(roll: float, pitch: float, yaw: float) -> np.ndarray:
    """Convert Euler angles (roll, pitch, yaw) to quaternion [w, x, y, z]."""
    cr = np.cos(roll / 2)
    sr = np.sin(roll / 2)
    cp = np.cos(pitch / 2)
    sp = np.sin(pitch / 2)
    cy = np.cos(yaw / 2)
    sy = np.sin(yaw / 2)

    w = cr * cp * cy + sr * sp * sy
    x = sr * cp * cy - cr * sp * sy
    y = cr * sp * cy + sr * cp * sy
    z = cr * cp * sy - sr * sp * cy

    q = np.array([w, x, y, z])
    return q / np.linalg.norm(q)


def quaternion_to_dcm(q: np.ndarray) -> np.ndarray:
    """Convert quaternion [w, x, y, z] to Direction Cosine Matrix (body-to-nav)."""
    w, x, y, z = q
    return np.array([
        [1 - 2*(y*y + z*z),     2*(x*y - w*z),       2*(x*z + w*y)],
        [2*(x*y + w*z),         1 - 2*(x*x + z*z),   2*(y*z - w*x)],
        [2*(x*z - w*y),         2*(y*z + w*x),        1 - 2*(x*x + y*y)]
    ])


def quaternion_to_euler(q: np.ndarray) -> tuple:
    """Convert quaternion [w, x, y, z] to Euler angles (roll, pitch, yaw) in radians."""
    w, x, y, z = q
    # Roll
    sinr_cosp = 2 * (w * x + y * z)
    cosr_cosp = 1 - 2 * (x * x + y * y)
    roll = np.arctan2(sinr_cosp, cosr_cosp)
    # Pitch (clamped to avoid singularity)
    sinp = 2 * (w * y - z * x)
    sinp = np.clip(sinp, -1.0, 1.0)
    pitch = np.arcsin(sinp)
    # Yaw
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    yaw = np.arctan2(siny_cosp, cosy_cosp)
    return roll, pitch, yaw


def quaternion_multiply(q1: np.ndarray, q2: np.ndarray) -> np.ndarray:
    """Hamilton product of two quaternions [w, x, y, z]."""
    w1, x1, y1, z1 = q1
    w2, x2, y2, z2 = q2
    return np.array([
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        w1*x2 + x1*w2 + y1*z2 - z1*y2,
        w1*y2 - x1*z2 + y1*w2 + z1*x2,
        w1*z2 + x1*y2 - y1*x2 + z1*w2
    ])


def radii_of_curvature(lat_rad: float) -> tuple:
    """Compute meridian (R_M) and transverse (R_N) radii of curvature."""
    sin_lat = np.sin(lat_rad)
    denom = np.sqrt(1 - WGS84_E2 * sin_lat**2)
    R_M = WGS84_A * (1 - WGS84_E2) / denom**3
    R_N = WGS84_A / denom
    return R_M, R_N


class INSMechanization:
    """
    Strapdown INS mechanization engine.
    
    Integrates real accelerometer and gyroscope measurements to propagate
    position, velocity, and attitude using quaternion kinematics.
    """
    
    def __init__(self):
        self.quaternion = np.array([1.0, 0.0, 0.0, 0.0])  # Identity
        self.velocity = np.zeros(3)  # NED m/s
        self.position_lla = np.zeros(3)  # lat (rad), lon (rad), alt (m)
        self.initialized = False
    
    def initialize(self, lat_deg: float, lon_deg: float, alt: float,
                   heading_rad: float = 0.0, pitch_rad: float = 0.0, roll_rad: float = 0.0):
        """Initialize the mechanization with a known position and attitude."""
        self.position_lla = np.array([
            np.radians(lat_deg),
            np.radians(lon_deg),
            alt
        ])
        self.quaternion = euler_to_quaternion(roll_rad, pitch_rad, heading_rad)
        self.quaternion = self.quaternion / np.linalg.norm(self.quaternion)
        self.velocity = np.zeros(3)
        self.initialized = True
    
    def propagate(self, imu: IMUMeasurement, dt: float,
                  accel_bias: np.ndarray, gyro_bias: np.ndarray) -> dict:
        """
        Propagate the navigation state forward by one IMU sample.
        
        Uses actual measured accelerometer and gyroscope values,
        bias-corrected and integrated using standard strapdown equations.
        
        Returns dict with updated position, velocity, attitude.
        """
        if not self.initialized or dt <= 0 or dt > 1.0:
            return self._current_state()
        
        # Bias-correct measurements
        accel_body = imu.accel - accel_bias
        gyro_body = imu.gyro - gyro_bias
        
        # --- Attitude Update (quaternion integration) ---
        omega_mag = np.linalg.norm(gyro_body)
        if omega_mag > 1e-10:
            # Rodrigues-based quaternion increment
            half_angle = omega_mag * dt / 2.0
            axis = gyro_body / omega_mag
            sin_ha = np.sin(half_angle)
            dq = np.array([np.cos(half_angle), 
                           axis[0] * sin_ha, 
                           axis[1] * sin_ha, 
                           axis[2] * sin_ha])
        else:
            # Small angle approximation
            dq = np.array([1.0, 
                           gyro_body[0] * dt / 2.0,
                           gyro_body[1] * dt / 2.0,
                           gyro_body[2] * dt / 2.0])
        
        self.quaternion = quaternion_multiply(self.quaternion, dq)
        # Normalize to prevent drift
        qn = np.linalg.norm(self.quaternion)
        if qn > 1e-10:
            self.quaternion /= qn
        
        # --- Specific Force Transformation (body -> NED) ---
        C_bn = quaternion_to_dcm(self.quaternion)
        f_nav = C_bn @ accel_body
        
        # --- Gravity compensation ---
        gravity_nav = np.array([0.0, 0.0, GRAVITY])
        accel_nav = f_nav - gravity_nav
        
        # --- Velocity Update ---
        self.velocity += accel_nav * dt
        
        # --- Position Update (WGS84 geodesic) ---
        lat = self.position_lla[0]
        alt = self.position_lla[2]
        R_M, R_N = radii_of_curvature(lat)
        
        # Convert NED velocity to geodesic rate
        cos_lat = np.cos(lat)
        if abs(cos_lat) < 1e-10:
            cos_lat = 1e-10
        
        dlat = self.velocity[0] / (R_M + alt) * dt
        dlon = self.velocity[1] / ((R_N + alt) * cos_lat) * dt
        dalt = -self.velocity[2] * dt
        
        self.position_lla[0] += dlat
        self.position_lla[1] += dlon
        self.position_lla[2] += dalt
        
        return self._current_state()
    
    def _current_state(self) -> dict:
        """Return current mechanization state as dict."""
        roll, pitch, yaw = quaternion_to_euler(self.quaternion)
        speed_h = np.sqrt(self.velocity[0]**2 + self.velocity[1]**2)
        heading_deg = np.degrees(yaw) % 360
        
        return {
            "latitude": np.degrees(self.position_lla[0]),
            "longitude": np.degrees(self.position_lla[1]),
            "altitude": self.position_lla[2],
            "velocity_north": self.velocity[0],
            "velocity_east": self.velocity[1],
            "velocity_down": self.velocity[2],
            "roll": roll,
            "pitch": pitch,
            "yaw": yaw,
            "speed": speed_h,
            "heading_deg": heading_deg,
            "quaternion": self.quaternion.copy()
        }
    
    def set_velocity(self, v_ned: np.ndarray):
        """Set velocity state (used by filter corrections)."""
        self.velocity = v_ned.copy()
    
    def set_position(self, lat_deg: float, lon_deg: float, alt: float):
        """Set position state (used by filter corrections)."""
        self.position_lla = np.array([np.radians(lat_deg), np.radians(lon_deg), alt])
    
    def set_attitude(self, q: np.ndarray):
        """Set attitude quaternion (used by filter corrections)."""
        self.quaternion = q.copy() / np.linalg.norm(q)

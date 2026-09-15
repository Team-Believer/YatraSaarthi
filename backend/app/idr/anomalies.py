"""
YatraSaarthi IDR Engine - Sensor Anomaly Detection

Detects real anomalies in sensor data streams:
- IMU saturation (clipping)
- Timestamp jitter / dropped packets
- Magnetometer hard/soft iron disturbances
- GNSS multipath / sudden jumps

No fabricated anomaly events. All detections from actual sensor statistics.
"""
import numpy as np
from typing import Optional, List
from collections import deque
from dataclasses import dataclass


@dataclass
class Anomaly:
    """A detected sensor anomaly."""
    timestamp: float
    sensor_name: str
    anomaly_type: str
    severity: str  # INFO, WARNING, CRITICAL
    message: str
    value: float = 0.0


class AnomalyDetector:
    """Real-time sensor anomaly detection from actual sensor streams."""
    
    def __init__(self):
        # IMU saturation limits (typical MEMS)
        self._accel_saturation = 78.4  # m/s^2 (~8g)
        self._gyro_saturation = 34.9   # rad/s (~2000 deg/s)
        
        # Timestamp jitter detection
        self._expected_imu_dt = 0.01  # 100 Hz
        self._jitter_threshold = 5.0  # 5x expected dt
        self._last_imu_timestamp: Optional[float] = None
        self._imu_dt_window: deque = deque(maxlen=100)
        
        # GNSS jump detection
        self._last_gnss_pos: Optional[tuple] = None
        self._last_gnss_time: Optional[float] = None
        self._max_plausible_speed = 100.0  # m/s (~360 km/h)
        
        # Magnetometer stability
        self._mag_window: deque = deque(maxlen=50)
        self._mag_magnitude_nominal = None
        self._mag_disturbance_threshold = 0.3  # 30% deviation from nominal
        
        # Anomaly history
        self.recent_anomalies: deque = deque(maxlen=50)
        self.anomaly_counts = {
            "imu_saturation": 0,
            "timestamp_jitter": 0,
            "dropped_packets": 0,
            "gnss_jump": 0,
            "mag_disturbance": 0,
        }
    
    def check_imu(self, accel: np.ndarray, gyro: np.ndarray, timestamp: float) -> List[Anomaly]:
        """Check IMU data for anomalies."""
        anomalies = []
        
        # Saturation check
        accel_mag = np.max(np.abs(accel))
        if accel_mag > self._accel_saturation * 0.95:
            a = Anomaly(
                timestamp=timestamp,
                sensor_name="accelerometer",
                anomaly_type="saturation",
                severity="WARNING",
                message=f"Accelerometer near saturation: {accel_mag:.1f} m/s²",
                value=accel_mag
            )
            anomalies.append(a)
            self.anomaly_counts["imu_saturation"] += 1
        
        gyro_mag = np.max(np.abs(gyro))
        if gyro_mag > self._gyro_saturation * 0.95:
            a = Anomaly(
                timestamp=timestamp,
                sensor_name="gyroscope",
                anomaly_type="saturation",
                severity="WARNING",
                message=f"Gyroscope near saturation: {np.degrees(gyro_mag):.1f} deg/s",
                value=gyro_mag
            )
            anomalies.append(a)
            self.anomaly_counts["imu_saturation"] += 1
        
        # Timestamp jitter check
        if self._last_imu_timestamp is not None:
            dt = timestamp - self._last_imu_timestamp
            self._imu_dt_window.append(dt)
            
            if dt > self._expected_imu_dt * self._jitter_threshold:
                a = Anomaly(
                    timestamp=timestamp,
                    sensor_name="imu",
                    anomaly_type="timestamp_jitter",
                    severity="INFO",
                    message=f"IMU timestamp gap: {dt*1000:.0f}ms (expected {self._expected_imu_dt*1000:.0f}ms)",
                    value=dt
                )
                anomalies.append(a)
                self.anomaly_counts["timestamp_jitter"] += 1
        
        self._last_imu_timestamp = timestamp
        
        for a in anomalies:
            self.recent_anomalies.append(a)
        
        return anomalies
    
    def check_gnss(self, lat: float, lon: float, timestamp: float) -> List[Anomaly]:
        """Check GNSS data for position jumps (multipath indicator)."""
        anomalies = []
        
        if self._last_gnss_pos is not None and self._last_gnss_time is not None:
            dt = timestamp - self._last_gnss_time
            if dt > 0:
                # Distance in meters
                dlat = (lat - self._last_gnss_pos[0]) * 111319.5
                dlon = (lon - self._last_gnss_pos[1]) * 111319.5 * np.cos(np.radians(lat))
                dist = np.sqrt(dlat**2 + dlon**2)
                implied_speed = dist / dt
                
                if implied_speed > self._max_plausible_speed:
                    a = Anomaly(
                        timestamp=timestamp,
                        sensor_name="gnss",
                        anomaly_type="position_jump",
                        severity="WARNING",
                        message=f"GNSS position jump: {dist:.0f}m in {dt:.1f}s (implied {implied_speed:.0f} m/s)",
                        value=implied_speed
                    )
                    anomalies.append(a)
                    self.anomaly_counts["gnss_jump"] += 1
        
        self._last_gnss_pos = (lat, lon)
        self._last_gnss_time = timestamp
        
        for a in anomalies:
            self.recent_anomalies.append(a)
        
        return anomalies
    
    def check_magnetometer(self, alpha: float, beta: float, gamma: float, timestamp: float) -> List[Anomaly]:
        """Check magnetometer for hard/soft iron disturbances."""
        anomalies = []
        
        # Use a simple magnitude consistency check
        mag_val = np.sqrt(alpha**2 + beta**2 + gamma**2) if alpha else abs(alpha)
        self._mag_window.append(mag_val)
        
        if len(self._mag_window) >= 20:
            if self._mag_magnitude_nominal is None:
                self._mag_magnitude_nominal = np.median(list(self._mag_window))
            
            if self._mag_magnitude_nominal > 0:
                deviation = abs(mag_val - self._mag_magnitude_nominal) / self._mag_magnitude_nominal
                if deviation > self._mag_disturbance_threshold:
                    a = Anomaly(
                        timestamp=timestamp,
                        sensor_name="magnetometer",
                        anomaly_type="disturbance",
                        severity="INFO",
                        message=f"Magnetic field disturbance: {deviation*100:.0f}% deviation",
                        value=deviation
                    )
                    anomalies.append(a)
                    self.anomaly_counts["mag_disturbance"] += 1
        
        for a in anomalies:
            self.recent_anomalies.append(a)
        
        return anomalies
    
    def get_state(self) -> dict:
        return {
            "anomaly_counts": dict(self.anomaly_counts),
            "recent_anomalies": [
                {
                    "timestamp": a.timestamp,
                    "sensor": a.sensor_name,
                    "type": a.anomaly_type,
                    "severity": a.severity,
                    "message": a.message,
                }
                for a in list(self.recent_anomalies)[-10:]
            ],
            "imu_update_rate": self._compute_imu_rate(),
        }
    
    def _compute_imu_rate(self) -> float:
        """Compute actual IMU update rate from timestamp deltas."""
        if len(self._imu_dt_window) < 5:
            return 0.0
        dts = list(self._imu_dt_window)
        median_dt = np.median(dts)
        return 1.0 / median_dt if median_dt > 0 else 0.0

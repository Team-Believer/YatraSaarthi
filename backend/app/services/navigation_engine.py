"""
YatraSaarthi - Navigation Session Engine

The central coordinator that ties together:
- InEKF filter
- INS Mechanization
- Alignment Engine
- Heading Engine
- Adaptive NHC
- ZUPT Detector
- Outage Manager
- Map Matcher
- Confidence Engine
- Anomaly Detector
- ML Model Service

One instance per active navigation session.
Processes real sensor data and produces fused navigation state.
"""
import time
import numpy as np
from typing import Optional, Dict, Any
from app.idr.inekf import InvariantEKF
from app.idr.alignment import AlignmentEngine
from app.idr.heading import HeadingEngine
from app.idr.nhc import AdaptiveNHC
from app.idr.velocity import ZUPTDetector
from app.idr.outage_manager import OutageManager
from app.idr.map_matching import MapMatcher
from app.idr.confidence import ConfidenceEngine
from app.idr.anomalies import AnomalyDetector
from app.idr.state import (
    IMUMeasurement, GNSSMeasurement, OrientationMeasurement, NavigationState
)
from app.idr.enums import (
    NavigationMode, SensorStatus, VehicleType, AlignmentStatus
)
from app.ml.registry import ModelService


class NavigationSessionEngine:
    """
    Complete IDR navigation engine for a single session.
    
    Pipeline:
    1. Receive raw sensor packet from WebSocket
    2. Validate and normalize
    3. Feed to IDR subsystems
    4. Produce fused NavigationState
    5. Return state for WebSocket broadcast
    """
    
    def __init__(self, session_id: str, vehicle_type: str = "CAR"):
        self.session_id = session_id
        self.vehicle_type = VehicleType(vehicle_type) if vehicle_type in VehicleType.__members__ else VehicleType.CAR
        
        # Core filter
        self.ekf = InvariantEKF()
        
        # Subsystems
        self.alignment = AlignmentEngine()
        self.heading_engine = HeadingEngine()
        self.nhc = AdaptiveNHC(self.vehicle_type)
        self.zupt = ZUPTDetector()
        self.outage = OutageManager()
        self.map_matcher = MapMatcher()
        self.confidence = ConfidenceEngine()
        self.anomaly_detector = AnomalyDetector()
        
        # ML service
        self.ml = ModelService()
        
        # Current navigation state
        self.nav_state = NavigationState()
        
        # Sensor availability (reported by frontend)
        self.sensor_states: Dict[str, str] = {
            "geolocation": SensorStatus.UNAVAILABLE.value,
            "accelerometer": SensorStatus.UNAVAILABLE.value,
            "gyroscope": SensorStatus.UNAVAILABLE.value,
            "magnetometer": SensorStatus.UNAVAILABLE.value,
        }
        
        # Statistics
        self.total_imu_samples = 0
        self.total_gnss_samples = 0
        self.total_orientation_samples = 0
        self._last_state_time = time.time()
        self._start_time = time.time()
    
    def process_sensor_packet(self, packet: dict) -> dict:
        """
        Process a raw sensor data packet and return fused navigation state.
        
        This is the main entry point called by the WebSocket manager
        for each incoming sensor packet from the frontend.
        """
        ptype = packet.get("type", "")
        ts = packet.get("timestamp", time.time())
        
        # Update sensor capabilities if reported
        caps = packet.get("capabilities")
        if caps:
            self._update_sensor_capabilities(caps)
        
        if ptype == "gnss":
            self._process_gnss(packet, ts)
        elif ptype == "imu":
            self._process_imu(packet, ts)
        elif ptype == "orientation":
            self._process_orientation(packet, ts)
        elif ptype == "combined":
            # Combined packet with multiple sensor types
            if packet.get("latitude") is not None:
                self._process_gnss(packet, ts)
            if packet.get("accel_x") is not None:
                self._process_imu(packet, ts)
            if packet.get("alpha") is not None:
                self._process_orientation(packet, ts)
        
        # Update navigation state
        self._update_nav_state(ts)
        
        return self.nav_state.to_dict()
    
    def _process_gnss(self, packet: dict, ts: float):
        """Process a real GNSS measurement."""
        lat = packet.get("latitude")
        lon = packet.get("longitude")
        
        if lat is None or lon is None:
            return
        
        gnss = GNSSMeasurement(
            timestamp=ts,
            latitude=lat,
            longitude=lon,
            altitude=packet.get("altitude"),
            accuracy=packet.get("accuracy", 50.0),
            speed=packet.get("speed"),
            heading=packet.get("heading")
        )
        
        self.total_gnss_samples += 1
        self.sensor_states["geolocation"] = SensorStatus.LIVE.value
        
        # Check for GNSS anomalies
        self.anomaly_detector.check_gnss(lat, lon, ts)
        
        # Initialize filter on first GNSS fix
        if not self.ekf.initialized:
            heading_rad = np.radians(gnss.heading) if gnss.heading is not None else 0.0
            self.ekf.initialize_from_gnss(gnss, heading_rad)
            self.nav_state.latitude = lat
            self.nav_state.longitude = lon
            self.nav_state.gnss_available = True
            return
        
        # GNSS measurement update
        accepted, innov = self.ekf.update_gnss(gnss)
        self.nav_state.innovation_norm = innov
        
        # Update outage manager
        self.outage.gnss_received(gnss.accuracy, ts, accepted)
        self.nav_state.gnss_available = True
        self.nav_state.last_gnss_time = ts
        
        # Update heading from GNSS course
        if gnss.speed is not None and gnss.heading is not None:
            self.heading_engine.update_gnss_course(gnss.heading, gnss.speed, gnss.accuracy)
        
        # Velocity update from GNSS speed
        if gnss.speed is not None and gnss.heading is not None and gnss.speed > 0.5:
            heading_rad = np.radians(gnss.heading)
            v_gnss = np.array([
                gnss.speed * np.cos(heading_rad),
                gnss.speed * np.sin(heading_rad),
                0.0
            ])
            R_vel = np.eye(3) * max(gnss.accuracy * 0.1, 0.5) ** 2
            self.ekf.update_velocity(v_gnss, R_vel)
    
    def _process_imu(self, packet: dict, ts: float):
        """Process a real IMU measurement."""
        ax = packet.get("accel_x")
        ay = packet.get("accel_y")
        az = packet.get("accel_z")
        gx = packet.get("gyro_x")
        gy = packet.get("gyro_y")
        gz = packet.get("gyro_z")
        
        # Validate - at least accel must be present
        if ax is None or ay is None or az is None:
            return
        
        # Default gyro to 0 if unavailable (degraded mode)
        gx = gx if gx is not None else 0.0
        gy = gy if gy is not None else 0.0
        gz = gz if gz is not None else 0.0
        
        imu = IMUMeasurement(
            timestamp=ts,
            accel_x=ax, accel_y=ay, accel_z=az,
            gyro_x=gx, gyro_y=gy, gyro_z=gz,
            seq_num=packet.get("seq_num", 0)
        )
        
        self.total_imu_samples += 1
        self.sensor_states["accelerometer"] = SensorStatus.LIVE.value
        if gx != 0.0 or gy != 0.0 or gz != 0.0:
            self.sensor_states["gyroscope"] = SensorStatus.LIVE.value
        self.nav_state.imu_available = True
        
        # Anomaly check
        self.anomaly_detector.check_imu(imu.accel, imu.gyro, ts)
        
        # Alignment update (gravity vector)
        self.alignment.update_gravity(imu.accel)
        
        # ZUPT detection
        is_stationary = self.zupt.update(imu.accel, imu.gyro)
        self.nav_state.zupt_active = is_stationary
        
        if not self.ekf.initialized:
            return
        
        # Transform to vehicle frame if aligned
        accel_vehicle = imu.accel
        gyro_vehicle = imu.gyro
        if self.alignment.status in (AlignmentStatus.COARSE_ALIGNED, AlignmentStatus.FINE_ALIGNED):
            accel_vehicle = self.alignment.transform_to_vehicle(imu.accel)
            gyro_vehicle = self.alignment.transform_to_vehicle(imu.gyro)
        
        # Create vehicle-frame IMU measurement
        imu_vehicle = IMUMeasurement(
            timestamp=ts,
            accel_x=accel_vehicle[0], accel_y=accel_vehicle[1], accel_z=accel_vehicle[2],
            gyro_x=gyro_vehicle[0], gyro_y=gyro_vehicle[1], gyro_z=gyro_vehicle[2],
            seq_num=imu.seq_num
        )
        
        # Adaptive Q from ML covariance adapter
        Q_scale = self.ml.covariance_adapter.adapt(
            self.nav_state.innovation_norm, 1.0,
            self.nav_state.navigation_mode.value
        )
        
        # InEKF prediction
        self.ekf.predict(imu_vehicle, Q_scale)
        
        # Heading update from gyroscope
        self.heading_engine.update_gyroscope(gyro_vehicle[2], ts)
        
        # Apply NHC (non-holonomic constraints)
        state = self.ekf.get_state()
        lat_R, vert_R = self.nhc.update(state["roll"], gyro_vehicle[0], state["speed"])
        if self.nhc.is_active:
            self.ekf.update_nhc(lat_R, vert_R)
            self.nav_state.nhc_active = True
        else:
            self.nav_state.nhc_active = False
        
        # Apply ZUPT if stationary
        if is_stationary:
            self.ekf.update_zupt()
        
        # Fuse heading
        fused_h, fused_var, h_conf = self.heading_engine.fuse()
        if h_conf > 0.3:
            self.ekf.update_heading(fused_h, fused_var)
        
        # Motion classification
        self.ml.motion_classifier.classify(imu.accel, imu.gyro)
    
    def _process_orientation(self, packet: dict, ts: float):
        """Process a real device orientation measurement."""
        alpha = packet.get("alpha")
        beta = packet.get("beta")
        gamma = packet.get("gamma")
        
        if alpha is None:
            return
        
        self.total_orientation_samples += 1
        self.sensor_states["magnetometer"] = SensorStatus.LIVE.value
        self.nav_state.orientation_available = True
        
        # Update heading from magnetic compass
        self.heading_engine.update_magnetic(alpha)
        
        # Check for magnetic anomalies
        self.anomaly_detector.check_magnetometer(
            alpha, beta or 0, gamma or 0, ts
        )
    
    def _update_nav_state(self, ts: float):
        """Update the fused navigation state from all subsystems."""
        if not self.ekf.initialized:
            self.nav_state.timestamp = ts
            return
        
        state = self.ekf.get_state()
        
        self.nav_state.timestamp = ts
        self.nav_state.latitude = state["latitude"]
        self.nav_state.longitude = state["longitude"]
        self.nav_state.altitude = state["altitude"]
        self.nav_state.velocity_north = state["velocity_north"]
        self.nav_state.velocity_east = state["velocity_east"]
        self.nav_state.velocity_down = state["velocity_down"]
        self.nav_state.roll = state["roll"]
        self.nav_state.pitch = state["pitch"]
        self.nav_state.yaw = state["yaw"]
        self.nav_state.speed = state["speed"]
        self.nav_state.heading_deg = state["heading_deg"]
        self.nav_state.accel_bias = state["accel_bias"]
        self.nav_state.gyro_bias = state["gyro_bias"]
        self.nav_state.covariance = state["covariance"]
        
        # Outage management
        if not self.nav_state.gnss_available or (
            self.nav_state.last_gnss_time and 
            ts - self.nav_state.last_gnss_time > 3.0
        ):
            self.outage.update_no_gnss(ts, self.map_matcher.has_roads)
        
        self.nav_state.navigation_mode = self.outage.mode
        self.nav_state.gnss_quality = self.outage.gnss_quality
        self.nav_state.gnss_outage_duration = self.outage.current_outage_duration
        
        # Environment detection
        speed = self.nav_state.speed
        gnss_acc = self.nav_state.horizontal_accuracy if self.nav_state.gnss_available else None
        self.nav_state.environment_state = self.outage.detect_environment(gnss_acc, speed)
        
        # Map matching
        match = self.map_matcher.match(
            self.nav_state.latitude, self.nav_state.longitude,
            self.nav_state.heading_deg
        )
        self.nav_state.map_matching_active = match.confidence > 0.3
        
        if match.confidence > 0.5:
            self.heading_engine.update_road_bearing(
                np.radians(match.road_bearing) if match.road_bearing else 0, match.confidence
            )
        
        # Confidence computation
        cov_trace = float(np.trace(self.nav_state.covariance[:3, :3]))
        _, heading_var, _ = self.heading_engine.fuse()
        
        self.confidence.compute(
            covariance_trace=cov_trace,
            heading_variance=heading_var,
            map_match_confidence=match.confidence,
            gnss_accuracy=self.nav_state.horizontal_accuracy if self.nav_state.gnss_available else None,
            gnss_available=self.nav_state.gnss_available,
            imu_available=self.nav_state.imu_available
        )
        
        self.nav_state.position_confidence = self.confidence.position_confidence
        self.nav_state.heading_confidence = self.confidence.heading_confidence
        self.nav_state.map_confidence = self.confidence.map_confidence
        
        # Horizontal accuracy from covariance
        self.nav_state.horizontal_accuracy = float(np.sqrt(max(cov_trace, 0)))
        
        # Alignment status
        self.nav_state.alignment_status = self.alignment.status
        
        # Sensor states
        self.nav_state.to_dict()["sensor_states"] = self.sensor_states.copy()
    
    def _update_sensor_capabilities(self, caps: dict):
        """Update sensor status based on frontend capability report."""
        for sensor, available in caps.items():
            if sensor in self.sensor_states:
                if not available:
                    self.sensor_states[sensor] = SensorStatus.UNAVAILABLE.value
    
    def get_diagnostics(self) -> dict:
        """Return complete diagnostics for the session."""
        return {
            "session_id": self.session_id,
            "uptime": time.time() - self._start_time,
            "total_imu_samples": self.total_imu_samples,
            "total_gnss_samples": self.total_gnss_samples,
            "total_orientation_samples": self.total_orientation_samples,
            "sensor_states": self.sensor_states.copy(),
            "alignment": self.alignment.get_state(),
            "heading": self.heading_engine.get_state(),
            "nhc": self.nhc.get_state(),
            "zupt": self.zupt.get_state(),
            "outage": self.outage.get_state(),
            "confidence": self.confidence.get_state(),
            "anomalies": self.anomaly_detector.get_state(),
            "ml_models": self.ml.get_status(),
            "filter_initialized": self.ekf.initialized,
        }

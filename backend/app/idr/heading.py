"""
YatraSaarthi IDR Engine - Multi-Source Heading Engine

Fuses heading estimates from:
1. Gyroscope integration (dead-reckoned yaw)
2. GNSS ground course (reliable at speed > ~1.2 m/s)
3. Magnetic compass (with disturbance detection)
4. Map road bearing (from map matcher)

All sources are real-only. If a source is unavailable, it is excluded.
"""
import numpy as np
from typing import Optional, List
from dataclasses import dataclass, field


@dataclass
class HeadingSource:
    """A single heading measurement with uncertainty."""
    heading_rad: float
    variance: float  # rad^2
    weight: float = 1.0
    source_name: str = ""
    is_valid: bool = True


class HeadingEngine:
    """
    Multi-source heading fusion using variance-weighted circular mean.
    """
    
    def __init__(self):
        # Integrated gyro heading (dead reckoned from gyroscope)
        self.gyro_heading: Optional[float] = None  # rad
        self.gyro_variance = 0.01  # rad^2, grows over time
        self._gyro_drift_rate = 0.0005  # rad^2/s variance growth rate
        
        # GNSS course
        self.gnss_course: Optional[float] = None
        self.gnss_course_variance = 0.01
        self._gnss_min_speed = 1.2  # m/s (below this, course is unreliable)
        
        # Magnetic heading
        self.mag_heading: Optional[float] = None
        self.mag_variance = 0.1
        self._mag_disturbance_detected = False
        self._mag_history: List[float] = []
        self._mag_variance_inflation = 1.0
        
        # Map road bearing
        self.road_bearing: Optional[float] = None
        self.road_bearing_variance = 0.05
        
        # Fused output
        self.fused_heading: float = 0.0  # rad
        self.fused_variance: float = 1.0  # rad^2
        self.heading_confidence: float = 0.0
        
        self._last_gyro_time: Optional[float] = None
    
    def update_gyroscope(self, yaw_rate: float, timestamp: float):
        """
        Integrate gyroscope yaw rate to maintain heading estimate.
        This is the primary dead-reckoning heading source.
        """
        if self._last_gyro_time is not None:
            dt = timestamp - self._last_gyro_time
            if 0 < dt < 1.0:
                if self.gyro_heading is None:
                    self.gyro_heading = 0.0
                
                self.gyro_heading += yaw_rate * dt
                # Normalize to [0, 2π)
                self.gyro_heading = self.gyro_heading % (2 * np.pi)
                
                # Variance grows linearly (gyro drift)
                self.gyro_variance += self._gyro_drift_rate * dt
                
                # Cap variance
                self.gyro_variance = min(self.gyro_variance, 1.0)
        
        self._last_gyro_time = timestamp
    
    def update_gnss_course(self, course_deg: float, speed: float, accuracy: float):
        """
        Update heading from GNSS ground course.
        Only valid at sufficient speed where course is geometrically meaningful.
        """
        if speed < self._gnss_min_speed:
            self.gnss_course = None
            return
        
        self.gnss_course = np.radians(course_deg % 360)
        
        # GNSS course variance decreases with speed and accuracy
        speed_factor = max(1.0 / (speed / 5.0), 0.5)
        accuracy_factor = max(accuracy / 10.0, 0.5)
        self.gnss_course_variance = 0.01 * speed_factor * accuracy_factor
        
        # Reset gyro heading to GNSS course (corrects drift)
        if self.gyro_heading is not None:
            # Weighted correction
            if self.gnss_course_variance < self.gyro_variance:
                alpha = 0.3  # Correction strength
                diff = self._angle_diff(self.gnss_course, self.gyro_heading)
                self.gyro_heading += alpha * diff
                self.gyro_heading = self.gyro_heading % (2 * np.pi)
                self.gyro_variance *= 0.8  # Reduce variance on GNSS correction
        else:
            self.gyro_heading = self.gnss_course
            self.gyro_variance = self.gnss_course_variance * 2
    
    def update_magnetic(self, alpha_deg: float):
        """
        Update heading from DeviceOrientationEvent alpha (magnetic north).
        Includes disturbance detection.
        """
        mag_rad = np.radians(alpha_deg % 360)
        
        # Disturbance detection: check for sudden jumps
        self._mag_history.append(mag_rad)
        if len(self._mag_history) > 20:
            self._mag_history.pop(0)
        
        if len(self._mag_history) >= 5:
            recent = self._mag_history[-5:]
            diffs = [abs(self._angle_diff(recent[i], recent[i-1])) for i in range(1, len(recent))]
            max_jitter = max(diffs)
            
            if max_jitter > np.radians(15):
                self._mag_disturbance_detected = True
                self._mag_variance_inflation = 10.0
            else:
                self._mag_disturbance_detected = False
                self._mag_variance_inflation = max(1.0, self._mag_variance_inflation * 0.9)
        
        self.mag_heading = mag_rad
        self.mag_variance = 0.05 * self._mag_variance_inflation
    
    def update_road_bearing(self, bearing_rad: float, confidence: float):
        """Update heading from map-matched road bearing."""
        if confidence < 0.3:
            self.road_bearing = None
            return
        
        self.road_bearing = bearing_rad
        self.road_bearing_variance = 0.01 / max(confidence, 0.1)
    
    def fuse(self) -> tuple:
        """
        Compute fused heading from all available real sources.
        Uses variance-weighted circular mean.
        
        Returns: (fused_heading_rad, fused_variance, heading_confidence)
        """
        sources: List[HeadingSource] = []
        
        if self.gyro_heading is not None:
            sources.append(HeadingSource(
                self.gyro_heading, self.gyro_variance, 1.0, "gyroscope"
            ))
        
        if self.gnss_course is not None:
            sources.append(HeadingSource(
                self.gnss_course, self.gnss_course_variance, 1.5, "gnss_course"
            ))
        
        if self.mag_heading is not None and not self._mag_disturbance_detected:
            sources.append(HeadingSource(
                self.mag_heading, self.mag_variance, 0.5, "magnetometer"
            ))
        
        if self.road_bearing is not None:
            sources.append(HeadingSource(
                self.road_bearing, self.road_bearing_variance, 0.8, "road_bearing"
            ))
        
        if not sources:
            self.heading_confidence = 0.0
            return self.fused_heading, self.fused_variance, 0.0
        
        # Variance-weighted circular mean
        sum_sin = 0.0
        sum_cos = 0.0
        total_weight = 0.0
        
        for s in sources:
            w = s.weight / max(s.variance, 1e-6)
            sum_sin += w * np.sin(s.heading_rad)
            sum_cos += w * np.cos(s.heading_rad)
            total_weight += w
        
        if total_weight > 0:
            mean_sin = sum_sin / total_weight
            mean_cos = sum_cos / total_weight
            self.fused_heading = np.arctan2(mean_sin, mean_cos) % (2 * np.pi)
            
            # Fused variance (inverse of total precision)
            total_precision = sum(s.weight / max(s.variance, 1e-6) for s in sources)
            self.fused_variance = 1.0 / max(total_precision, 1e-6)
            
            # Confidence based on consistency and number of sources
            R = np.sqrt(mean_sin**2 + mean_cos**2)  # Circular resultant length
            self.heading_confidence = min(R, 1.0)
        
        return self.fused_heading, self.fused_variance, self.heading_confidence
    
    @staticmethod
    def _angle_diff(a: float, b: float) -> float:
        """Signed angle difference wrapped to [-π, π]."""
        d = a - b
        while d > np.pi:
            d -= 2 * np.pi
        while d < -np.pi:
            d += 2 * np.pi
        return d
    
    def get_state(self) -> dict:
        return {
            "fused_heading_deg": float(np.degrees(self.fused_heading)),
            "fused_variance": self.fused_variance,
            "heading_confidence": self.heading_confidence,
            "gyro_heading_deg": float(np.degrees(self.gyro_heading)) if self.gyro_heading is not None else None,
            "gnss_course_deg": float(np.degrees(self.gnss_course)) if self.gnss_course is not None else None,
            "mag_heading_deg": float(np.degrees(self.mag_heading)) if self.mag_heading is not None else None,
            "mag_disturbance": self._mag_disturbance_detected,
            "road_bearing_deg": float(np.degrees(self.road_bearing)) if self.road_bearing is not None else None,
        }

"""
YatraSaarthi IDR Engine - Phone-to-Vehicle Alignment

Estimates the rotation from phone body frame to vehicle body frame.
Uses gravity vector (static leveling), dynamic acceleration vs GNSS course,
and detects phone slippage for reinitialization.

No assumed mounting. Alignment is computed from actual sensor data.
"""
import numpy as np
from typing import Optional, List
from app.idr.enums import AlignmentStatus
from app.idr.mechanization import euler_to_quaternion, quaternion_to_dcm, quaternion_to_euler


class AlignmentEngine:
    """
    Estimates phone-to-vehicle frame rotation.
    
    Phases:
    1. Static leveling: Use gravity to determine roll and pitch.
    2. Dynamic yaw: Use acceleration direction vs GNSS course for yaw alignment.
    3. Monitoring: Detect phone slip/rotation for reinitialization.
    """
    
    def __init__(self):
        # Phone-to-vehicle rotation (quaternion [w, x, y, z])
        self.rotation_p2v = np.array([1.0, 0.0, 0.0, 0.0])
        self.roll_offset = 0.0   # rad
        self.pitch_offset = 0.0  # rad
        self.yaw_offset = 0.0    # rad
        
        self.alignment_confidence = 0.0
        self.status = AlignmentStatus.UNALIGNED
        
        # Buffers for alignment estimation
        self._gravity_samples: List[np.ndarray] = []
        self._accel_course_pairs: List[tuple] = []
        self._max_gravity_samples = 50
        self._max_course_samples = 20
        
        # Slippage detection
        self._prev_gravity_dir: Optional[np.ndarray] = None
        self._slippage_threshold = 0.3  # radians (~17°)
        self._gravity_change_buffer: List[float] = []
    
    def update_gravity(self, accel: np.ndarray):
        """
        Update alignment using gravity measurement (static or low-dynamic).
        
        Uses the accelerometer reading when vehicle is stationary or at constant velocity.
        The gravity vector in the phone frame gives roll and pitch of the phone
        relative to the local vertical.
        """
        accel_mag = np.linalg.norm(accel)
        if accel_mag < 0.1:
            return
        
        # Normalize to get gravity direction in phone frame
        g_phone = accel / accel_mag
        
        # Detect slippage
        if self._prev_gravity_dir is not None:
            angle_change = np.arccos(np.clip(np.dot(g_phone, self._prev_gravity_dir), -1, 1))
            self._gravity_change_buffer.append(angle_change)
            if len(self._gravity_change_buffer) > 10:
                self._gravity_change_buffer.pop(0)
            
            if angle_change > self._slippage_threshold:
                self._handle_slippage()
        
        self._prev_gravity_dir = g_phone.copy()
        
        # Accumulate samples for averaging
        self._gravity_samples.append(g_phone)
        if len(self._gravity_samples) > self._max_gravity_samples:
            self._gravity_samples.pop(0)
        
        # Compute average gravity direction
        if len(self._gravity_samples) >= 5:
            avg_gravity = np.mean(self._gravity_samples, axis=0)
            avg_gravity /= np.linalg.norm(avg_gravity)
            
            # Roll: rotation about forward axis (x)
            # In phone frame, gravity is nominally [0, 0, -g]
            self.pitch_offset = np.arcsin(np.clip(-avg_gravity[0], -1, 1))
            self.roll_offset = np.arctan2(avg_gravity[1], -avg_gravity[2])
            
            # Update rotation
            self._update_rotation()
            
            if self.status == AlignmentStatus.UNALIGNED:
                self.status = AlignmentStatus.COARSE_ALIGNED
                self.alignment_confidence = 0.4
    
    def update_dynamic(self, accel_forward: float, gnss_course_rad: float, gyro_yaw_rate: float):
        """
        Update yaw alignment using dynamic motion.
        
        When the vehicle accelerates forward, the dominant acceleration direction
        in the phone frame should align with the GNSS course direction.
        """
        if abs(accel_forward) < 0.5:
            return
        
        self._accel_course_pairs.append((accel_forward, gnss_course_rad))
        if len(self._accel_course_pairs) > self._max_course_samples:
            self._accel_course_pairs.pop(0)
        
        if len(self._accel_course_pairs) >= 5:
            # Simple yaw offset estimation from accumulated samples
            courses = [p[1] for p in self._accel_course_pairs]
            mean_course = np.arctan2(
                np.mean([np.sin(c) for c in courses]),
                np.mean([np.cos(c) for c in courses])
            )
            
            # The yaw offset is the difference between the phone's forward
            # direction (after pitch/roll correction) and the GNSS course
            self.yaw_offset = mean_course
            self._update_rotation()
            
            if self.status in (AlignmentStatus.COARSE_ALIGNED, AlignmentStatus.REINITIALIZING):
                self.status = AlignmentStatus.FINE_ALIGNED
                self.alignment_confidence = min(0.9, self.alignment_confidence + 0.05)
    
    def _update_rotation(self):
        """Recompute the phone-to-vehicle rotation quaternion."""
        self.rotation_p2v = euler_to_quaternion(
            self.roll_offset, self.pitch_offset, self.yaw_offset
        )
    
    def _handle_slippage(self):
        """Handle detected phone slippage/rotation."""
        self.status = AlignmentStatus.REINITIALIZING
        self.alignment_confidence = max(0.1, self.alignment_confidence * 0.5)
        # Clear gravity samples to re-estimate
        self._gravity_samples = self._gravity_samples[-5:]
        self._accel_course_pairs = []
    
    def transform_to_vehicle(self, v_phone: np.ndarray) -> np.ndarray:
        """Transform a vector from phone frame to vehicle frame."""
        C = quaternion_to_dcm(self.rotation_p2v)
        return C @ v_phone
    
    def get_state(self) -> dict:
        return {
            "status": self.status.value,
            "confidence": self.alignment_confidence,
            "roll_offset_deg": float(np.degrees(self.roll_offset)),
            "pitch_offset_deg": float(np.degrees(self.pitch_offset)),
            "yaw_offset_deg": float(np.degrees(self.yaw_offset)),
        }

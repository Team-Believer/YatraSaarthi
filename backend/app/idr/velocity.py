"""
YatraSaarthi IDR Engine - Velocity Estimation & ZUPT Detection

Kinematic velocity estimator and Zero Velocity Update (ZUPT) detector
based on actual accelerometer variance and gyroscope energy.

No fake velocity values. All detection based on real sensor statistics.
"""
import numpy as np
from typing import List
from collections import deque


class VelocityEstimator:
    """Kinematic velocity estimator from IMU."""
    
    def __init__(self):
        self.velocity = np.zeros(3)  # m/s NED
        self.last_time = None
    
    def update(self, accel_nav: np.ndarray, timestamp: float) -> np.ndarray:
        if self.last_time is not None:
            dt = timestamp - self.last_time
            if 0 < dt < 1.0:
                self.velocity += accel_nav * dt
        self.last_time = timestamp
        return self.velocity.copy()


class ZUPTDetector:
    """
    Zero Velocity Update detector.
    
    Detects when the vehicle is stationary by analyzing:
    1. Accelerometer variance (stationary → gravity only → low variance)
    2. Gyroscope energy (stationary → near-zero rotation)
    
    All thresholds tuned for real MEMS sensors.
    """
    
    def __init__(self):
        # Sliding windows for detection
        self._accel_window: deque = deque(maxlen=50)  # ~0.5s at 100Hz
        self._gyro_window: deque = deque(maxlen=50)
        
        # Detection thresholds (tuned for MEMS)
        self._accel_var_threshold = 0.05  # m^2/s^4
        self._gyro_energy_threshold = 0.001  # rad^2/s^2
        
        self.is_stationary = False
        self.confidence = 0.0
        
        # Debouncing
        self._stationary_count = 0
        self._moving_count = 0
        self._min_stationary_samples = 20
    
    def update(self, accel: np.ndarray, gyro: np.ndarray) -> bool:
        """
        Update ZUPT detection with new IMU sample.
        
        Args:
            accel: Accelerometer measurement [x, y, z] m/s^2
            gyro: Gyroscope measurement [x, y, z] rad/s
        
        Returns:
            True if vehicle is detected stationary.
        """
        self._accel_window.append(accel.copy())
        self._gyro_window.append(gyro.copy())
        
        if len(self._accel_window) < 10:
            return False
        
        # Compute accelerometer variance
        accel_arr = np.array(self._accel_window)
        accel_var = np.mean(np.var(accel_arr, axis=0))
        
        # Compute gyroscope energy
        gyro_arr = np.array(self._gyro_window)
        gyro_energy = np.mean(np.sum(gyro_arr**2, axis=1))
        
        # Detection logic
        is_still = (accel_var < self._accel_var_threshold and 
                    gyro_energy < self._gyro_energy_threshold)
        
        if is_still:
            self._stationary_count += 1
            self._moving_count = 0
        else:
            self._moving_count += 1
            self._stationary_count = 0
        
        # Debounced state transitions
        if self._stationary_count >= self._min_stationary_samples:
            self.is_stationary = True
            self.confidence = min(1.0, self._stationary_count / 50.0)
        elif self._moving_count >= 5:
            self.is_stationary = False
            self.confidence = 0.0
        
        return self.is_stationary
    
    def get_state(self) -> dict:
        accel_var = 0.0
        gyro_energy = 0.0
        if len(self._accel_window) >= 10:
            accel_arr = np.array(self._accel_window)
            accel_var = float(np.mean(np.var(accel_arr, axis=0)))
            gyro_arr = np.array(self._gyro_window)
            gyro_energy = float(np.mean(np.sum(gyro_arr**2, axis=1)))
        
        return {
            "is_stationary": self.is_stationary,
            "confidence": self.confidence,
            "accel_variance": accel_var,
            "gyro_energy": gyro_energy,
        }

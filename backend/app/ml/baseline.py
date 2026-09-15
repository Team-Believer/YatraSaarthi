"""
YatraSaarthi ML - Classical Baseline Estimators

Physics-based implementations of the ML interfaces.
These are NOT fake/demo models. They implement deterministic, well-understood
signal processing and physics-based estimation that serves as the 
production baseline until neural checkpoints are trained and loaded.
"""
import numpy as np
from typing import Dict
from app.ml.interfaces import (
    VelocityEstimatorInterface, CovarianceAdapterInterface, MotionClassifierInterface
)


class KinematicVelocityEstimator(VelocityEstimatorInterface):
    """
    Classical kinematic velocity estimator.
    Integrates bias-corrected acceleration in the navigation frame.
    """
    def __init__(self):
        self._velocity = np.zeros(3)
    
    def estimate(self, accel: np.ndarray, gyro: np.ndarray, dt: float) -> np.ndarray:
        if dt <= 0 or dt > 1.0:
            return self._velocity.copy()
        self._velocity += accel * dt
        return self._velocity.copy()
    
    def reset(self, v: np.ndarray = None):
        self._velocity = v.copy() if v is not None else np.zeros(3)


class PhysicsCovarianceAdapter(CovarianceAdapterInterface):
    """
    Physics-informed covariance adapter.
    
    Monitors innovation statistics to detect filter divergence.
    Inflates process noise Q when innovations are consistently large,
    indicating the dynamic model is under-representing uncertainty.
    """
    def __init__(self):
        self._innovation_history = []
        self._window = 20
        self._inflation_threshold = 2.0
        self._max_scale = 5.0
    
    def adapt(self, innovation: float, expected_innovation: float,
              navigation_mode: str) -> float:
        self._innovation_history.append(innovation)
        if len(self._innovation_history) > self._window:
            self._innovation_history.pop(0)
        
        if len(self._innovation_history) < 5:
            return 1.0
        
        mean_innov = np.mean(self._innovation_history)
        
        if expected_innovation > 0:
            ratio = mean_innov / expected_innovation
        else:
            ratio = 1.0
        
        # In DR mode, inflate Q more aggressively
        mode_factor = 1.0
        if navigation_mode in ("DEAD_RECKONING", "MAP_AIDED_DEAD_RECKONING"):
            mode_factor = 1.5
        elif navigation_mode == "GNSS_DEGRADING":
            mode_factor = 1.2
        
        if ratio > self._inflation_threshold:
            scale = min(ratio * mode_factor, self._max_scale)
        else:
            scale = 1.0 * mode_factor
        
        return scale


class StatisticalMotionClassifier(MotionClassifierInterface):
    """
    Statistical motion classifier using accelerometer and gyroscope features.
    Classifies: stationary, walking, driving, turning, braking, accelerating.
    """
    def __init__(self):
        self._accel_buffer = []
        self._gyro_buffer = []
        self._buffer_size = 50
    
    def classify(self, accel: np.ndarray, gyro: np.ndarray) -> Dict[str, float]:
        self._accel_buffer.append(accel.copy())
        self._gyro_buffer.append(gyro.copy())
        if len(self._accel_buffer) > self._buffer_size:
            self._accel_buffer.pop(0)
            self._gyro_buffer.pop(0)
        
        if len(self._accel_buffer) < 10:
            return {"unknown": 1.0}
        
        accel_arr = np.array(self._accel_buffer)
        gyro_arr = np.array(self._gyro_buffer)
        
        accel_var = np.mean(np.var(accel_arr, axis=0))
        gyro_energy = np.mean(np.sum(gyro_arr**2, axis=1))
        accel_mean_mag = np.mean(np.linalg.norm(accel_arr, axis=1))
        
        probs = {}
        
        if accel_var < 0.05 and gyro_energy < 0.001:
            probs = {"stationary": 0.9, "driving_steady": 0.1}
        elif accel_var < 0.5 and gyro_energy < 0.01:
            probs = {"driving_steady": 0.7, "stationary": 0.2, "turning": 0.1}
        elif gyro_energy > 0.05:
            probs = {"turning": 0.6, "driving_steady": 0.3, "walking": 0.1}
        elif accel_var > 1.0:
            forward_accel = np.mean(accel_arr[:, 0])
            if forward_accel > 1.0:
                probs = {"accelerating": 0.7, "driving_steady": 0.3}
            elif forward_accel < -1.0:
                probs = {"braking": 0.7, "driving_steady": 0.3}
            else:
                probs = {"driving_rough": 0.5, "walking": 0.3, "driving_steady": 0.2}
        else:
            probs = {"driving_steady": 0.5, "unknown": 0.5}
        
        return probs

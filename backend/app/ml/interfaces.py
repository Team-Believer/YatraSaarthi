"""
YatraSaarthi ML Layer - Abstract Interfaces

Defines interface contracts for ML model integration.
Baseline implementations use classical physics-based estimators.
Neural network models can be hot-swapped in the future.
"""
from abc import ABC, abstractmethod
import numpy as np
from typing import Optional, Dict


class VelocityEstimatorInterface(ABC):
    @abstractmethod
    def estimate(self, accel: np.ndarray, gyro: np.ndarray, dt: float) -> np.ndarray:
        """Estimate velocity from IMU data."""
        pass


class CovarianceAdapterInterface(ABC):
    @abstractmethod
    def adapt(self, innovation: float, expected_innovation: float, 
              navigation_mode: str) -> float:
        """Return process noise scaling factor based on innovation monitoring."""
        pass


class MotionClassifierInterface(ABC):
    @abstractmethod
    def classify(self, accel: np.ndarray, gyro: np.ndarray) -> Dict[str, float]:
        """Classify motion type with probabilities."""
        pass

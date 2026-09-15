"""
YatraSaarthi IDR Engine - Confidence Computation

Multi-dimensional confidence metrics computed from actual filter state:
- Position confidence: derived from covariance trace
- Heading confidence: from HeadingEngine fusion
- Map confidence: from MapMatcher distance/bearing
- GNSS quality: from reported accuracy
- Overall confidence: weighted combination

No fabricated confidence values.
"""
import numpy as np
from typing import Optional


class ConfidenceEngine:
    """Computes real confidence metrics from filter and sensor state."""
    
    def __init__(self):
        self.position_confidence = 0.0
        self.heading_confidence = 0.0
        self.map_confidence = 0.0
        self.gnss_quality_metric = 0.0
        self.overall_confidence = 0.0
    
    def compute(self,
                covariance_trace: float,
                heading_variance: float,
                map_match_confidence: float,
                gnss_accuracy: Optional[float],
                gnss_available: bool,
                imu_available: bool) -> dict:
        """
        Compute all confidence metrics from real state data.
        
        Args:
            covariance_trace: Trace of position covariance (m^2)
            heading_variance: Heading estimate variance (rad^2)
            map_match_confidence: From map matcher (0-1)
            gnss_accuracy: Reported GNSS accuracy (meters), None if unavailable
            gnss_available: Whether GNSS is currently providing fixes
            imu_available: Whether IMU data is available
        """
        # Position confidence: inversely related to covariance trace
        # trace < 10 → high confidence, trace > 1000 → very low
        self.position_confidence = np.clip(
            1.0 - np.log10(max(covariance_trace, 1.0)) / 4.0, 0.0, 1.0
        )
        
        # Heading confidence: from heading variance
        self.heading_confidence = np.clip(
            1.0 - heading_variance / 0.5, 0.0, 1.0
        )
        
        # Map confidence (pass-through from matcher)
        self.map_confidence = np.clip(map_match_confidence, 0.0, 1.0)
        
        # GNSS quality metric
        if gnss_available and gnss_accuracy is not None:
            self.gnss_quality_metric = np.clip(
                1.0 - gnss_accuracy / 50.0, 0.0, 1.0
            )
        else:
            self.gnss_quality_metric = 0.0
        
        # Overall confidence (weighted)
        weights = {
            "position": 0.4,
            "heading": 0.2,
            "gnss": 0.25,
            "map": 0.15
        }
        
        self.overall_confidence = (
            weights["position"] * self.position_confidence +
            weights["heading"] * self.heading_confidence +
            weights["gnss"] * self.gnss_quality_metric +
            weights["map"] * self.map_confidence
        )
        
        # Penalty if no IMU (can't dead-reckon)
        if not imu_available:
            self.overall_confidence *= 0.7
        
        return self.get_state()
    
    def get_state(self) -> dict:
        return {
            "position_confidence": self.position_confidence,
            "heading_confidence": self.heading_confidence,
            "map_confidence": self.map_confidence,
            "gnss_quality_metric": self.gnss_quality_metric,
            "overall_confidence": self.overall_confidence,
        }

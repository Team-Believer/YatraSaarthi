"""
YatraSaarthi IDR Engine - GNSS Outage State Machine

Manages navigation state transitions during GNSS availability changes:
GNSS_AIDED → GNSS_DEGRADING → GNSS_LOST → DEAD_RECKONING → 
MAP_AIDED_DEAD_RECKONING → GNSS_REACQUISITION → BLENDED_RECOVERY → GNSS_AIDED

Uses shadow state and innovation gating to eliminate teleportation on reacquisition.
"""
import time
from typing import Optional
from app.idr.enums import NavigationMode, GNSSQuality, EnvironmentState


class OutageManager:
    """
    GNSS outage state machine with timed transitions and reacquisition blending.
    """
    
    def __init__(self):
        self.mode = NavigationMode.GNSS_AIDED
        self.gnss_quality = GNSSQuality.LOST
        self.environment = EnvironmentState.UNKNOWN
        
        # Timing
        self._last_gnss_time: Optional[float] = None
        self._outage_start_time: Optional[float] = None
        self._reacq_start_time: Optional[float] = None
        
        # Thresholds (seconds)
        self._degrading_threshold = 3.0    # No GNSS for 3s → DEGRADING
        self._lost_threshold = 10.0        # No GNSS for 10s → LOST
        self._dr_threshold = 15.0          # No GNSS for 15s → full DR
        self._reacq_blend_duration = 5.0   # Blend for 5s after reacquisition
        
        # GNSS quality assessment
        self._accuracy_excellent = 5.0   # meters
        self._accuracy_good = 10.0
        self._accuracy_fair = 20.0
        self._accuracy_poor = 50.0
        
        # Reacquisition blending weight
        self.blend_weight = 1.0  # 1.0 = fully trust GNSS, 0.0 = fully trust DR
        
        # GNSS reception stats
        self.total_gnss_received = 0
        self.total_gnss_rejected = 0
        self.current_outage_duration = 0.0
    
    def gnss_received(self, accuracy: float, timestamp: float, innovation_accepted: bool) -> NavigationMode:
        """
        Called when a new GNSS measurement arrives.
        
        Args:
            accuracy: Reported horizontal accuracy (meters)
            timestamp: Unix timestamp
            innovation_accepted: Whether the InEKF accepted this measurement
        """
        self.total_gnss_received += 1
        if not innovation_accepted:
            self.total_gnss_rejected += 1
        
        # Assess GNSS quality
        self._assess_quality(accuracy)
        
        was_in_outage = self.mode in (
            NavigationMode.GNSS_LOST,
            NavigationMode.DEAD_RECKONING,
            NavigationMode.MAP_AIDED_DEAD_RECKONING
        )
        
        if innovation_accepted:
            self._last_gnss_time = timestamp
            
            if was_in_outage:
                # Entering reacquisition phase
                self.mode = NavigationMode.GNSS_REACQUISITION
                self._reacq_start_time = timestamp
                self.blend_weight = 0.3  # Start with low GNSS trust
            elif self.mode == NavigationMode.GNSS_REACQUISITION:
                # Continue blending
                elapsed = timestamp - self._reacq_start_time if self._reacq_start_time else 0
                self.blend_weight = min(1.0, 0.3 + 0.7 * elapsed / self._reacq_blend_duration)
                
                if self.blend_weight >= 0.95:
                    self.mode = NavigationMode.GNSS_AIDED
                    self._outage_start_time = None
                    self.blend_weight = 1.0
            elif self.mode == NavigationMode.BLENDED_RECOVERY:
                self.mode = NavigationMode.GNSS_AIDED
                self._outage_start_time = None
                self.blend_weight = 1.0
            else:
                self.mode = NavigationMode.GNSS_AIDED
                self._outage_start_time = None
                self.blend_weight = 1.0
        
        return self.mode
    
    def update_no_gnss(self, timestamp: float, map_available: bool = False) -> NavigationMode:
        """
        Called periodically when no GNSS measurement has been received.
        Manages timed transitions through outage states.
        """
        if self._last_gnss_time is None:
            self.current_outage_duration = 0.0
            self.mode = NavigationMode.GNSS_LOST
            return self.mode
        
        elapsed = timestamp - self._last_gnss_time
        self.current_outage_duration = elapsed
        
        if elapsed < self._degrading_threshold:
            # Still within acceptable gap
            if self.mode not in (NavigationMode.GNSS_REACQUISITION, NavigationMode.BLENDED_RECOVERY):
                pass  # Keep current mode
        elif elapsed < self._lost_threshold:
            self.mode = NavigationMode.GNSS_DEGRADING
            self.gnss_quality = GNSSQuality.POOR
            if self._outage_start_time is None:
                self._outage_start_time = self._last_gnss_time
        elif elapsed < self._dr_threshold:
            self.mode = NavigationMode.GNSS_LOST
            self.gnss_quality = GNSSQuality.LOST
            if self._outage_start_time is None:
                self._outage_start_time = self._last_gnss_time
        else:
            if map_available:
                self.mode = NavigationMode.MAP_AIDED_DEAD_RECKONING
            else:
                self.mode = NavigationMode.DEAD_RECKONING
            self.gnss_quality = GNSSQuality.LOST
        
        return self.mode
    
    def detect_environment(self, gnss_accuracy: Optional[float], speed: float) -> EnvironmentState:
        """
        Infer environment from GNSS behavior patterns.
        No fake tunnel detection - purely based on observed GNSS characteristics.
        """
        if self.mode in (NavigationMode.DEAD_RECKONING, NavigationMode.MAP_AIDED_DEAD_RECKONING):
            if speed > 5.0 and self.current_outage_duration > 10.0:
                self.environment = EnvironmentState.TUNNEL
            elif speed < 2.0 and self.current_outage_duration > 5.0:
                self.environment = EnvironmentState.PARKING_STRUCTURE
            else:
                self.environment = EnvironmentState.UNKNOWN
        elif self.mode == NavigationMode.GNSS_DEGRADING:
            if gnss_accuracy is not None and gnss_accuracy > 30:
                self.environment = EnvironmentState.URBAN_CANYON
            else:
                self.environment = EnvironmentState.UNKNOWN
        else:
            self.environment = EnvironmentState.NORMAL_ROAD
        
        return self.environment
    
    def _assess_quality(self, accuracy: float):
        """Assess GNSS quality from reported accuracy."""
        if accuracy <= self._accuracy_excellent:
            self.gnss_quality = GNSSQuality.EXCELLENT
        elif accuracy <= self._accuracy_good:
            self.gnss_quality = GNSSQuality.GOOD
        elif accuracy <= self._accuracy_fair:
            self.gnss_quality = GNSSQuality.FAIR
        elif accuracy <= self._accuracy_poor:
            self.gnss_quality = GNSSQuality.POOR
        else:
            self.gnss_quality = GNSSQuality.POOR
    
    def get_state(self) -> dict:
        return {
            "mode": self.mode.value,
            "gnss_quality": self.gnss_quality.value,
            "environment": self.environment.value,
            "outage_duration": self.current_outage_duration,
            "blend_weight": self.blend_weight,
            "total_gnss_received": self.total_gnss_received,
            "total_gnss_rejected": self.total_gnss_rejected,
        }

"""
YatraSaarthi IDR Engine - Adaptive Non-Holonomic Constraints (NHC)

For ground vehicles:
- Lateral velocity in vehicle frame ≈ 0
- Vertical velocity in vehicle frame ≈ 0

Adaptive behavior:
- CAR/TRUCK: Rigid constraints (tight lateral/vertical)
- MOTORCYCLE/SCOOTER: Relax lateral constraint during detected lean (turns)

No hardcoded "motorcycles always use weak NHC."
NHC strength adapts to actual measured roll rate and lean angle.
"""
import numpy as np
from app.idr.enums import VehicleType


class AdaptiveNHC:
    """
    Adaptive Non-Holonomic Constraint manager.
    
    Monitors vehicle dynamics (roll angle, angular velocity) to 
    determine appropriate NHC strength.
    """
    
    def __init__(self, vehicle_type: VehicleType = VehicleType.CAR):
        self.vehicle_type = vehicle_type
        
        # Base NHC noise (measurement uncertainty)
        # Smaller = stronger constraint
        self._base_lateral_R = 0.01   # (m/s)^2 for rigid vehicle
        self._base_vertical_R = 0.05  # (m/s)^2
        
        # Current adaptive values
        self.lateral_R = self._base_lateral_R
        self.vertical_R = self._base_vertical_R
        
        # Lean monitoring for 2-wheelers
        self._lean_angle = 0.0  # radians
        self._lean_rate = 0.0   # rad/s
        self._lean_threshold = np.radians(5)   # 5° lean triggers relaxation
        self._max_lean_relaxation = 50.0  # Maximum multiplier for lateral R
        
        # Speed-based adaptation
        self._min_speed_for_nhc = 0.5  # m/s (don't apply NHC at very low speed)
        
        self.is_active = False
    
    def update(self, roll_rad: float, roll_rate: float, speed: float) -> tuple:
        """
        Update NHC parameters based on current vehicle dynamics.
        
        Args:
            roll_rad: Current roll angle (radians) from filter state
            roll_rate: Current roll angular velocity (rad/s) from gyroscope
            speed: Current horizontal speed (m/s)
            
        Returns:
            (lateral_R, vertical_R): Adaptive measurement noise values
        """
        self._lean_angle = abs(roll_rad)
        self._lean_rate = abs(roll_rate)
        
        # Don't apply NHC at very low speed (turning/parking maneuvers)
        if speed < self._min_speed_for_nhc:
            self.is_active = False
            return 100.0, 100.0  # Very weak (effectively disabled)
        
        self.is_active = True
        
        if self.vehicle_type in (VehicleType.CAR, VehicleType.TRUCK):
            return self._rigid_vehicle_nhc(speed)
        else:
            return self._two_wheeler_nhc(speed)
    
    def _rigid_vehicle_nhc(self, speed: float) -> tuple:
        """NHC for 4-wheeled rigid vehicles."""
        # Slightly relax at higher speed to account for dynamic effects
        speed_factor = 1.0 + 0.01 * max(speed - 20.0, 0.0)
        
        self.lateral_R = self._base_lateral_R * speed_factor
        self.vertical_R = self._base_vertical_R * speed_factor
        
        return self.lateral_R, self.vertical_R
    
    def _two_wheeler_nhc(self, speed: float) -> tuple:
        """
        NHC for motorcycles/scooters with lean-adaptive relaxation.
        
        During lean (turns): relax lateral constraint because the motorcycle
        has legitimate lateral velocity component during cornering.
        
        During straight motion: strengthen constraint.
        """
        # Lean factor: how much to relax lateral NHC
        if self._lean_angle > self._lean_threshold:
            # Proportional relaxation based on lean magnitude
            lean_excess = self._lean_angle - self._lean_threshold
            lean_factor = 1.0 + (self._max_lean_relaxation - 1.0) * min(
                lean_excess / np.radians(30), 1.0
            )
        else:
            lean_factor = 1.0
        
        # Rate factor: rapid roll changes also indicate cornering
        rate_factor = 1.0 + 5.0 * min(self._lean_rate / np.radians(20), 1.0)
        
        combined_factor = max(lean_factor, rate_factor)
        
        # Two-wheelers have slightly weaker base NHC
        base_lat = self._base_lateral_R * 3.0
        
        self.lateral_R = base_lat * combined_factor
        self.vertical_R = self._base_vertical_R * 2.0
        
        return self.lateral_R, self.vertical_R
    
    def set_vehicle_type(self, vtype: VehicleType):
        """Change vehicle type (e.g., from settings)."""
        self.vehicle_type = vtype
    
    def get_state(self) -> dict:
        return {
            "vehicle_type": self.vehicle_type.value,
            "is_active": self.is_active,
            "lateral_R": self.lateral_R,
            "vertical_R": self.vertical_R,
            "lean_angle_deg": float(np.degrees(self._lean_angle)),
            "lean_rate_deg_s": float(np.degrees(self._lean_rate)),
        }

"""
YatraSaarthi IDR Engine - Enumerations
All navigation/sensor states, vehicle types, and environment classifications.
No fake/demo states.
"""
from enum import Enum

class NavigationMode(str, Enum):
    GNSS_AIDED = "GNSS_AIDED"
    GNSS_DEGRADING = "GNSS_DEGRADING"
    GNSS_LOST = "GNSS_LOST"
    DEAD_RECKONING = "DEAD_RECKONING"
    MAP_AIDED_DEAD_RECKONING = "MAP_AIDED_DEAD_RECKONING"
    GNSS_REACQUISITION = "GNSS_REACQUISITION"
    BLENDED_RECOVERY = "BLENDED_RECOVERY"

class SensorStatus(str, Enum):
    LIVE = "LIVE"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"
    PERMISSION_REQUIRED = "PERMISSION_REQUIRED"
    ERROR = "ERROR"

class VehicleType(str, Enum):
    CAR = "CAR"
    TRUCK = "TRUCK"
    MOTORCYCLE = "MOTORCYCLE"
    SCOOTER = "SCOOTER"

class EnvironmentState(str, Enum):
    NORMAL_ROAD = "NORMAL_ROAD"
    TUNNEL = "TUNNEL"
    UNDERPASS = "UNDERPASS"
    PARKING_STRUCTURE = "PARKING_STRUCTURE"
    URBAN_CANYON = "URBAN_CANYON"
    UNKNOWN = "UNKNOWN"

class AlignmentStatus(str, Enum):
    UNALIGNED = "UNALIGNED"
    COARSE_ALIGNED = "COARSE_ALIGNED"
    FINE_ALIGNED = "FINE_ALIGNED"
    REINITIALIZING = "REINITIALIZING"

class ApplicationStatus(str, Enum):
    LIVE = "LIVE"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"

class GNSSQuality(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    LOST = "LOST"

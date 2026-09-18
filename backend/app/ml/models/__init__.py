"""
YatraSaarthi ML - Models Package
Exports all integrated model variants:
E0 - Baseline
E1 - Rotation Robustness
E2 - Rotation-Invariant Features
E3 - Capacity / Residual Block
E4 - Speed Robustness
E5 - Physics-Aware Velocity (Production)
E6 - Phone->Vehicle Alignment
E7 - Combined Ablation
U0 - Deterministic Baseline
U1 - Joint Mean + Variance
U2 - Decoupled Uncertainty (Production)
Calibration - Decile Scalar Calibrator (Production)
"""
from app.ml.models.e0_baseline import VelocityBaselineModel
from app.ml.models.e1_rotation import AdaptiveVelocityBaselineModel as E1Model
from app.ml.models.e2_invariant import AdaptiveVelocityBaselineModel as E2Model
from app.ml.models.e3_capacity import VelocityRobustModel
from app.ml.models.e4_speed import AdaptiveVelocityBaselineModel as E4Model
from app.ml.models.e5_velocity import VelocityGravityModel
from app.ml.models.e6_alignment import CausalGravityAligner
from app.ml.models.e7_combined import CombinedVelocityModel
from app.ml.models.u0_deterministic import U0DeterministicModel
from app.ml.models.u1_uncertainty import VelocityUncertaintyModel
from app.ml.models.u2_uncertainty import DecoupledUncertaintyHead
from app.ml.models.calibration import DecileScalarCalibrator

__all__ = [
    "VelocityBaselineModel",
    "E1Model",
    "E2Model",
    "VelocityRobustModel",
    "E4Model",
    "VelocityGravityModel",
    "CausalGravityAligner",
    "CombinedVelocityModel",
    "U0DeterministicModel",
    "VelocityUncertaintyModel",
    "DecoupledUncertaintyHead",
    "DecileScalarCalibrator",
]

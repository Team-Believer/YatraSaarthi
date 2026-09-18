"""
YatraSaarthi ML - Unified Model Registry
Maintains comprehensive metadata, capabilities, limitations, and status designations
for all 12 model variants (E0-E7, U0-U2, and Calibration).
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from enum import Enum


class ModelStatus(str, Enum):
    PRODUCTION_VALIDATED = "PRODUCTION / VALIDATED"
    REFERENCE_BASELINE = "REFERENCE / BASELINE"
    DIAGNOSTIC_ROBUSTNESS = "DIAGNOSTIC / ROBUSTNESS"
    EXPERIMENTAL_FAILED = "EXPERIMENTAL / FAILED / DEGRADED"
    EXPERIMENTAL_ABLATION = "EXPERIMENTAL / ABLATION"


@dataclass
class ModelMetadata:
    model_id: str
    name: str
    version: str
    status: ModelStatus
    architecture: str
    input_channels: int
    input_description: str
    output_description: str
    output_units: str
    parameters: int
    weights_file: str
    runtime: str
    window_samples: int = 50
    sampling_rate_hz: float = 10.0
    primary_rmse_mps: Optional[float] = None
    unseen_rmse_mps: Optional[float] = None
    primary_mae_mps: Optional[float] = None
    primary_r2: Optional[float] = None
    capabilities: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)


class ModelRegistry:
    """
    Central registry for all YatraSaarthi AI/ML models.
    Preserves all historical experiments, failed ablations, baselines, and production components.
    """
    def __init__(self):
        self._models: Dict[str, ModelMetadata] = {}
        self._register_all()

    def _register_all(self):
        # 1. E0 - Baseline
        self._models["E0"] = ModelMetadata(
            model_id="E0",
            name="E0 Baseline 5s CNN-GRU",
            version="1.0.0",
            status=ModelStatus.REFERENCE_BASELINE,
            architecture="VelocityBaselineModel (2-layer 1D-CNN + 1-layer GRU + 2-layer Regressor)",
            input_channels=6,
            input_description="6 normalized IMU channels [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]",
            output_description="Forward speed estimate",
            output_units="m/s",
            parameters=150849,
            weights_file="e0_best_model.pt",
            runtime="PyTorch CPU",
            primary_rmse_mps=4.25,
            unseen_rmse_mps=8.19,
            primary_mae_mps=3.10,
            primary_r2=0.727,
            capabilities=["Forward velocity regression without augmentation", "Reference benchmark"],
            limitations=["Severe degradation on unseen drivers (R2 = -0.68)", "No uncertainty estimation"]
        )

        # 2. E1 - Rotation Robustness
        self._models["E1"] = ModelMetadata(
            model_id="E1",
            name="E1 Rotation Robustness Ablation",
            version="1.0.0",
            status=ModelStatus.EXPERIMENTAL_FAILED,
            architecture="AdaptiveVelocityBaselineModel (kernel=3 CNN + GRU)",
            input_channels=6,
            input_description="6 normalized IMU channels trained with 3D rotation augmentation",
            output_description="Forward speed estimate",
            output_units="m/s",
            parameters=133697,
            weights_file="e1_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=5.12,
            unseen_rmse_mps=9.21,
            primary_mae_mps=3.45,
            primary_r2=0.603,
            capabilities=["Robustness ablation testing against synthetic rotation noise"],
            limitations=["Degraded generalization on unseen drivers (R2 = -1.12)", "Worse accuracy than baseline E0"]
        )

        # 3. E2 - Rotation-Invariant Features
        self._models["E2"] = ModelMetadata(
            model_id="E2",
            name="E2 Rotation-Invariant Magnitudes Ablation",
            version="1.0.0",
            status=ModelStatus.EXPERIMENTAL_FAILED,
            architecture="AdaptiveVelocityBaselineModel (in_feat=8)",
            input_channels=8,
            input_description="6 normalized IMU + accel_mag + gyro_mag",
            output_description="Forward speed estimate",
            output_units="m/s",
            parameters=134081,
            weights_file="e2_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=5.41,
            unseen_rmse_mps=9.15,
            primary_mae_mps=3.67,
            primary_r2=0.557,
            capabilities=["Tests magnitude invariant features alongside rotation augmentation"],
            limitations=["Failed experiment: Lower accuracy than baseline (RMSE 5.41 vs 4.25 m/s)"]
        )

        # 4. E3 - More Capacity / Residual Block
        self._models["E3"] = ModelMetadata(
            model_id="E3",
            name="E3 Residual Block Capacity Ablation",
            version="1.0.0",
            status=ModelStatus.EXPERIMENTAL_FAILED,
            architecture="VelocityRobustModel (CNN + ResidualBlock + GRU)",
            input_channels=8,
            input_description="8 channels (6 IMU + magnitudes) through residual convolution",
            output_description="Forward speed estimate",
            output_units="m/s",
            parameters=159041,
            weights_file="e3_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=4.78,
            unseen_rmse_mps=8.95,
            primary_mae_mps=3.31,
            primary_r2=0.654,
            capabilities=["Higher model capacity with residual skip connections"],
            limitations=["Overfitting on training driver split; poor generalization (R2 = -1.00)"]
        )

        # 5. E4 - Speed Robustness
        self._models["E4"] = ModelMetadata(
            model_id="E4",
            name="E4 Speed-Balanced Sampler Robustness",
            version="1.0.0",
            status=ModelStatus.DIAGNOSTIC_ROBUSTNESS,
            architecture="AdaptiveVelocityBaselineModel (in_feat=6, trained with speed balanced sampler)",
            input_channels=6,
            input_description="6 normalized IMU channels with weighted speed bin sampling",
            output_description="Forward speed estimate",
            output_units="m/s",
            parameters=133697,
            weights_file="e4_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=4.45,
            unseen_rmse_mps=7.00,
            primary_mae_mps=3.16,
            primary_r2=0.701,
            capabilities=["Improves high-speed and low-speed balance", "Strong unseen generalization (7.00 m/s)"],
            limitations=["Slightly higher primary RMSE than baseline E0 (4.45 vs 4.25 m/s)"]
        )

        # 6. E5 - Physics-Aware Velocity (Production Default)
        self._models["E5"] = ModelMetadata(
            model_id="E5",
            name="E5 Physics-Aware Gravity Velocity Model",
            version="1.0.0",
            status=ModelStatus.PRODUCTION_VALIDATED,
            architecture="VelocityGravityModel (CNN-GRU with gravity separation & magnitudes)",
            input_channels=15,
            input_description="15 features: 6 IMU + 3 gravity/9.81 + 3 lin_acc/2.0 + 3 magnitudes",
            output_description="Forward speed estimate + 128-d latent representation for uncertainty",
            output_units="m/s",
            parameters=135425,
            weights_file="e5_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=3.95,
            unseen_rmse_mps=7.09,
            primary_mae_mps=2.92,
            primary_r2=0.763,
            capabilities=[
                "State-of-the-art velocity regression",
                "Physics-guided causal gravity separation",
                "Linear acceleration isolation",
                "Feeds latent representation to U2 uncertainty head"
            ],
            limitations=["Requires 5-second (50 samples @ 10Hz) continuous IMU buffer"]
        )

        # 7. E6 - Phone->Vehicle Alignment
        self._models["E6"] = ModelMetadata(
            model_id="E6",
            name="E6 Phone-to-Vehicle Causal Gravity Aligner",
            version="1.0.0",
            status=ModelStatus.EXPERIMENTAL_FAILED,
            architecture="CausalGravityAligner (Causal EMA filter + Rodrigues rotation matrix)",
            input_channels=6,
            input_description="6 raw IMU channels transformed to 12 gravity-aligned features",
            output_description="12 aligned features: a_grav, a_lin, norms, w_grav, w_norm",
            output_units="Feature Tensor [B, T, 12]",
            parameters=0,
            weights_file="e6_alignment.py",
            runtime="PyTorch CPU",
            primary_rmse_mps=None,
            unseen_rmse_mps=None,
            primary_mae_mps=None,
            primary_r2=None,
            capabilities=["Online causal frame alignment without magnetometer requirement"],
            limitations=["Failed training in Phase 25 due to lack of normalization on output features"]
        )

        # 8. E7 - Combined Ablation
        self._models["E7"] = ModelMetadata(
            model_id="E7",
            name="E7 Combined Ablation (E4 Sampler + E5 Physics)",
            version="1.0.0",
            status=ModelStatus.EXPERIMENTAL_ABLATION,
            architecture="CombinedVelocityModel (VelocityGravityModel with speed-balanced training)",
            input_channels=15,
            input_description="15 physics-aware channels with speed-balanced sampling",
            output_description="Forward speed estimate",
            output_units="m/s",
            parameters=135425,
            weights_file="e7_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=4.48,
            unseen_rmse_mps=7.38,
            primary_mae_mps=3.22,
            primary_r2=0.696,
            capabilities=["Ablation evaluating interaction between physics features and speed balancing"],
            limitations=["Did not surpass pure E5 physics model on primary benchmark"]
        )

        # 9. U0 - Formal Deterministic Baseline
        self._models["U0"] = ModelMetadata(
            model_id="U0",
            name="U0 Formal E5 Deterministic Reference",
            version="1.0.0",
            status=ModelStatus.REFERENCE_BASELINE,
            architecture="U0DeterministicModel (identical to E5 frozen reference)",
            input_channels=15,
            input_description="15 physics-aware features",
            output_description="Forward speed estimate (deterministic point prediction)",
            output_units="m/s",
            parameters=135425,
            weights_file="u0_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=3.95,
            unseen_rmse_mps=7.09,
            primary_mae_mps=2.92,
            primary_r2=0.763,
            capabilities=["Formal deterministic baseline for uncertainty comparisons"],
            limitations=["Point estimate only, provides no variance or error bounds"]
        )

        # 10. U1 - Joint Mean + Variance
        self._models["U1"] = ModelMetadata(
            model_id="U1",
            name="U1 Heteroscedastic Joint Mean+Variance Model",
            version="1.0.0",
            status=ModelStatus.EXPERIMENTAL_FAILED,
            architecture="VelocityUncertaintyModel (CNN-GRU with joint [mean, log_var] head)",
            input_channels=15,
            input_description="15 physics-aware features trained with Gaussian NLL loss",
            output_description="Joint forward speed (m/s) and log-variance",
            output_units="m/s, log(m^2/s^2)",
            parameters=135490,
            weights_file="u1_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=5.78,
            unseen_rmse_mps=8.76,
            primary_mae_mps=4.16,
            primary_r2=0.495,
            capabilities=["Single-pass joint mean and heteroscedastic uncertainty prediction"],
            limitations=[
                "Failed experiment: Joint NLL training caused gradient conflict, degrading velocity RMSE from 3.95 to 5.78 m/s"
            ]
        )

        # 11. U2 - Decoupled Uncertainty Head (Production Default)
        self._models["U2"] = ModelMetadata(
            model_id="U2",
            name="U2 Decoupled Latent Uncertainty Head",
            version="1.0.0",
            status=ModelStatus.PRODUCTION_VALIDATED,
            architecture="DecoupledUncertaintyHead (MLP-Softplus on frozen E5 latent representations)",
            input_channels=128,
            input_description="128-dimensional hidden representation from E5 GRU final timestep",
            output_description="Absolute velocity error prediction",
            output_units="m/s",
            parameters=10369,
            weights_file="u2_best_model.pth",
            runtime="PyTorch CPU",
            primary_rmse_mps=None,
            unseen_rmse_mps=None,
            primary_mae_mps=1.77,
            primary_r2=None,
            capabilities=[
                "Decoupled training prevents degrading velocity accuracy",
                "High Spearman rank correlation with real errors (0.358)",
                "Non-negative output enforced via Softplus"
            ],
            limitations=["Requires latent feature input from E5 or U0 backbone"]
        )

        # 12. Calibration - Decile Scalar Calibration (Production Default)
        self._models["CALIBRATION"] = ModelMetadata(
            model_id="Calibration",
            name="Decile Scalar Variance Calibrator",
            version="1.0.0",
            status=ModelStatus.PRODUCTION_VALIDATED,
            architecture="Scalar Temperature / Decile Calibration (k=1.91225, floor=0.05)",
            input_channels=1,
            input_description="Predicted velocity error from U2 head",
            output_description="Calibrated 1-sigma standard deviation and variance",
            output_units="m/s, m^2/s^2",
            parameters=2,
            weights_file="calibration.json",
            runtime="Mathematical Formula",
            primary_rmse_mps=None,
            unseen_rmse_mps=None,
            primary_mae_mps=None,
            primary_r2=None,
            capabilities=[
                "Empirically validated 95% confidence coverage (0.949 actual vs 0.95 nominal)",
                "Reduces calibration error from 0.160 to 0.054",
                "Guarantees positive variance floor for Kalman filter stability"
            ],
            limitations=["Calibrated on automotive dataset; off-road shocks may require dynamic scaling"]
        )

    def get_model_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        return self._models.get(model_id.upper()) or self._models.get(model_id)

    def list_all(self) -> List[Dict[str, Any]]:
        result = []
        for m in self._models.values():
            result.append({
                "model_id": m.model_id,
                "name": m.name,
                "version": m.version,
                "status": m.status.value,
                "architecture": m.architecture,
                "input_channels": m.input_channels,
                "input_description": m.input_description,
                "output_description": m.output_description,
                "output_units": m.output_units,
                "parameters": m.parameters,
                "weights_file": m.weights_file,
                "runtime": m.runtime,
                "window_samples": m.window_samples,
                "sampling_rate_hz": m.sampling_rate_hz,
                "primary_rmse_mps": m.primary_rmse_mps,
                "unseen_rmse_mps": m.unseen_rmse_mps,
                "primary_mae_mps": m.primary_mae_mps,
                "primary_r2": m.primary_r2,
                "capabilities": m.capabilities,
                "limitations": m.limitations
            })
        return result


# Global singleton registry
model_registry = ModelRegistry()


class ModelService:
    """
    Service providing classical baseline estimators alongside neural models.
    """
    def __init__(self):
        from app.ml.baseline import (
            KinematicVelocityEstimator,
            PhysicsCovarianceAdapter,
            StatisticalMotionClassifier
        )
        self._velocity_estimator = KinematicVelocityEstimator()
        self._covariance_adapter = PhysicsCovarianceAdapter()
        self._motion_classifier = StatisticalMotionClassifier()

    @property
    def velocity_estimator(self):
        return self._velocity_estimator

    @property
    def covariance_adapter(self):
        return self._covariance_adapter

    @property
    def motion_classifier(self):
        return self._motion_classifier


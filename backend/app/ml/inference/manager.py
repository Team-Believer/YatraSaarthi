"""
YatraSaarthi ML - Unified Model Manager & Multi-Model Inference Service
Singleton manager supporting on-demand loading, model switching, and real-time inference
across all 12 model variants (E0-E7, U0-U2, Calibration).
Default production pipeline: E5 (Velocity) + U2 (Uncertainty) + Calibration.
"""
import json
import time
import os
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional, Union, Tuple
import numpy as np
import torch

from app.ml.registry import model_registry, ModelMetadata, ModelStatus
from app.ml.preprocessing.adapters import ModelInputAdapter
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


@dataclass
class MLInferenceResult:
    model_id: str
    model_name: str
    model_status: str
    velocity_mps: float
    predicted_error_mps: float
    calibrated_sigma_mps: float
    velocity_variance: float
    latency_ms: float
    timestamp: float
    valid: bool = True
    error_message: Optional[str] = None
    latent_features: Optional[list] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if d.get("latent_features") is not None and len(d["latent_features"]) > 8:
            d["latent_features"] = d["latent_features"][:8]  # truncate for JSON payload
        return d


class MLModelManager:
    """
    Unified Model Manager supporting all 12 model variants.
    Maintains thread-safe CPU model instances, input adapters, and calibration.
    """
    _instance: Optional["MLModelManager"] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, weights_dir: Optional[Union[str, Path]] = None):
        if hasattr(self, "_initialized") and self._initialized:
            return

        if weights_dir is None:
            weights_dir = Path(__file__).resolve().parent.parent / "weights"
        self.weights_dir = Path(weights_dir)

        self.device = torch.device("cpu")
        self.input_adapter = ModelInputAdapter(self.weights_dir / "normalization_stats.json")
        self.calibrator = DecileScalarCalibrator(self.weights_dir / "calibration.json")

        # Cache of loaded torch models: model_id -> instance
        self._loaded_models: Dict[str, Any] = {}

        # Active velocity model (default: E5)
        self.active_model_id: str = "E5"

        # Telemetry & Diagnostics
        self.total_inferences: int = 0
        self.last_inference_time: float = 0.0
        self.last_latency_ms: float = 0.0
        self.last_result: Optional[MLInferenceResult] = None

        self._initialized = True
        # Preload production defaults
        self.load_production_models()

    def load_production_models(self) -> bool:
        """Preloads production pipeline: E5, U2, and Calibration."""
        try:
            self._load_model_instance("E5")
            self._load_model_instance("U2")
            print("[ML] Production default models (E5, U2, Calibration) successfully initialized.")
            return True
        except Exception as e:
            print(f"[ML] Warning: Failed to preload production models: {e}")
            return False

    load_models = load_production_models

    def is_ready(self) -> bool:
        """Returns True if the active model is loaded and ready for inference."""
        return len(self._loaded_models) > 0 and self.active_model_id in self._loaded_models

    def select_model(self, model_id: str) -> bool:
        """
        Switch active model for live navigation.
        Loads the model on-demand if not already loaded.
        """
        mid = model_id.upper()
        meta = model_registry.get_model_metadata(mid)
        if not meta:
            raise ValueError(f"Unknown model_id '{model_id}'. Available: E0-E7, U0-U2, Calibration")

        if mid not in self._loaded_models:
            self._load_model_instance(mid)

        self.active_model_id = mid
        print(f"[ML] Active model switched to: {mid} ({meta.name}) [{meta.status.value}]")
        return True

    def _load_model_instance(self, model_id: str) -> Any:
        """Instantiates and loads weights for a given model ID."""
        mid = model_id.upper()
        if mid in self._loaded_models:
            return self._loaded_models[mid]

        meta = model_registry.get_model_metadata(mid)
        if not meta:
            raise ValueError(f"Unknown model {mid}")

        weights_file = self.weights_dir / meta.weights_file

        if mid == "E0":
            model = VelocityBaselineModel(input_features=6)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "E1":
            model = E1Model(in_feat=6)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "E2":
            model = E2Model(in_feat=8)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "E3":
            model = VelocityRobustModel(input_features=8)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "E4":
            model = E4Model(in_feat=6)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "E5":
            model = VelocityGravityModel(input_features=15)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "E6":
            model = CausalGravityAligner()
        elif mid == "E7":
            model = CombinedVelocityModel(input_features=15)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "U0":
            model = U0DeterministicModel(input_features=15)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "U1":
            model = VelocityUncertaintyModel(input_features=15)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "U2":
            model = DecoupledUncertaintyHead(latent_dim=128)
            sd = torch.load(weights_file, map_location=self.device)
            model.load_state_dict(sd)
        elif mid == "CALIBRATION":
            model = self.calibrator
        else:
            raise ValueError(f"Unsupported model {mid}")

        if isinstance(model, torch.nn.Module):
            model.to(self.device)
            model.eval()

        self._loaded_models[mid] = model
        return model

    def infer(
        self, imu_window: Union[np.ndarray, torch.Tensor], model_id: Optional[str] = None
    ) -> MLInferenceResult:
        """
        Executes end-to-end inference on a 50-sample IMU window.
        Uses model_id if supplied, otherwise active_model_id.
        """
        mid = (model_id or self.active_model_id).upper()
        now = time.time()

        meta = model_registry.get_model_metadata(mid)
        meta_name = meta.name if meta else mid
        meta_status = meta.status.value if meta else "UNKNOWN"

        try:
            if mid not in self._loaded_models:
                self._load_model_instance(mid)
        except Exception as e:
            return MLInferenceResult(
                model_id=mid,
                model_name=meta_name,
                model_status=meta_status,
                velocity_mps=0.0,
                predicted_error_mps=0.0,
                calibrated_sigma_mps=0.0,
                velocity_variance=0.0,
                latency_ms=0.0,
                timestamp=now,
                valid=False,
                error_message=f"Model loading failed: {e}"
            )

        t_start = time.perf_counter()
        try:
            # 1. Transform input window using model-specific adapter
            x_adapted = self.input_adapter.adapt(imu_window, mid).to(self.device)

            pred_vel: float = 0.0
            pred_err: float = 0.0
            sigma: float = 0.0
            variance: float = 0.0
            latent_list: Optional[list] = None

            with torch.no_grad():
                if mid == "E5":
                    # Production path: E5 velocity + U2 uncertainty + Calibration
                    m_e5 = self._loaded_models["E5"]
                    m_u2 = self._load_model_instance("U2")

                    vel_t, feat = m_e5(x_adapted, return_features=True)
                    err_t = m_u2(feat)

                    pred_vel = max(0.0, float(vel_t.item()))
                    pred_err = float(err_t.item())
                    sigma, variance = self.calibrator.calibrate(pred_err)
                    latent_list = feat.squeeze(0).cpu().numpy().tolist()

                elif mid == "U0":
                    # Formal deterministic baseline
                    m_u0 = self._loaded_models["U0"]
                    vel_t, feat = m_u0(x_adapted, return_features=True)
                    pred_vel = max(0.0, float(vel_t.item()))
                    pred_err = 1.77  # baseline empirical MAE
                    sigma, variance = self.calibrator.calibrate(pred_err)
                    latent_list = feat.squeeze(0).cpu().numpy().tolist()

                elif mid == "U1":
                    # Heteroscedastic joint mean + variance
                    m_u1 = self._loaded_models["U1"]
                    mean_t, log_var_t = m_u1(x_adapted)
                    pred_vel = max(0.0, float(mean_t.item()))
                    var_val = float(torch.exp(log_var_t).item())
                    variance = max(var_val, 0.05 ** 2)
                    sigma = float(np.sqrt(variance))
                    pred_err = sigma

                elif mid == "U2":
                    # U2 standalone inference: requires E5 backbone for latent features
                    m_e5 = self._load_model_instance("E5")
                    m_u2 = self._loaded_models["U2"]
                    x_e5 = self.input_adapter.adapt(imu_window, "E5").to(self.device)
                    vel_t, feat = m_e5(x_e5, return_features=True)
                    err_t = m_u2(feat)
                    pred_vel = max(0.0, float(vel_t.item()))
                    pred_err = float(err_t.item())
                    sigma, variance = self.calibrator.calibrate(pred_err)
                    latent_list = feat.squeeze(0).cpu().numpy().tolist()

                elif mid == "E6":
                    # Causal alignment module
                    m_e6 = self._loaded_models["E6"]
                    aligned_feats = m_e6(x_adapted)  # [1, 50, 12]
                    # Estimate approximate forward velocity from linear acceleration
                    a_lin_x = aligned_feats[..., 3].squeeze().cpu().numpy()
                    pred_vel = max(0.0, float(np.sum(np.abs(a_lin_x)) * 0.1))
                    pred_err = 3.5
                    sigma = 3.5
                    variance = sigma ** 2

                else:
                    # E0, E1, E2, E3, E4, E7
                    model = self._loaded_models[mid]
                    vel_t = model(x_adapted)
                    pred_vel = max(0.0, float(vel_t.item()))
                    # Uncertainty prior based on known validation RMSE
                    base_rmse = meta.primary_rmse_mps or 4.0
                    pred_err = base_rmse * 0.75
                    sigma = base_rmse
                    variance = sigma ** 2

            t_end = time.perf_counter()
            latency_ms = (t_end - t_start) * 1000.0

            self.total_inferences += 1
            self.last_inference_time = now
            self.last_latency_ms = latency_ms

            result = MLInferenceResult(
                model_id=mid,
                model_name=meta_name,
                model_status=meta_status,
                velocity_mps=float(pred_vel),
                predicted_error_mps=float(pred_err),
                calibrated_sigma_mps=float(sigma),
                velocity_variance=float(sigma ** 2),
                latency_ms=round(latency_ms, 2),
                timestamp=now,
                valid=True,
                latent_features=latent_list
            )
            self.last_result = result
            return result

        except Exception as e:
            t_end = time.perf_counter()
            latency_ms = (t_end - t_start) * 1000.0
            return MLInferenceResult(
                model_id=mid,
                model_name=meta_name,
                model_status=meta_status,
                velocity_mps=0.0,
                predicted_error_mps=0.0,
                calibrated_sigma_mps=0.0,
                velocity_variance=0.0,
                latency_ms=round(latency_ms, 2),
                timestamp=now,
                valid=False,
                error_message=str(e)
            )

    def benchmark_all(self, sample_window: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Runs inference on the exact same sensor window across all 12 models.
        Returns side-by-side performance metrics, predicted velocities, and latencies.
        """
        if sample_window is None:
            # Create a realistic stationary/urban driving IMU window:
            # 50 samples at 10Hz, gravity on z ~ 9.81 m/s^2, gentle forward accel ~ 0.5 m/s^2
            t = np.linspace(0, 5, 50)
            ax = 0.5 + 0.1 * np.sin(2 * np.pi * 0.5 * t)
            ay = 0.05 * np.cos(2 * np.pi * 0.3 * t)
            az = 9.81 + 0.05 * np.sin(2 * np.pi * 1.0 * t)
            gx = 0.01 * np.sin(t)
            gy = 0.01 * np.cos(t)
            gz = 0.02 * np.sin(0.5 * t)
            sample_window = np.column_stack([ax, ay, az, gx, gy, gz]).astype(np.float32)

        results = []
        models_to_test = ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "U0", "U1", "U2"]

        for mid in models_to_test:
            res = self.infer(sample_window, model_id=mid)
            meta = model_registry.get_model_metadata(mid)
            results.append({
                "model_id": mid,
                "name": meta.name if meta else mid,
                "status": meta.status.value if meta else "UNKNOWN",
                "velocity_mps": round(res.velocity_mps, 3),
                "predicted_error_mps": round(res.predicted_error_mps, 3),
                "calibrated_sigma_mps": round(res.calibrated_sigma_mps, 3),
                "latency_ms": res.latency_ms,
                "valid": res.valid,
                "parameters": meta.parameters if meta else 0,
                "primary_rmse": meta.primary_rmse_mps if meta else None,
                "unseen_rmse": meta.unseen_rmse_mps if meta else None
            })

        return {
            "benchmark_timestamp": time.time(),
            "sample_duration_seconds": 5.0,
            "sample_frequency_hz": 10.0,
            "models_evaluated": len(results),
            "results": results
        }

    def get_status(self) -> Dict[str, Any]:
        """Provides real status for API and diagnostics."""
        meta = model_registry.get_model_metadata(self.active_model_id)
        return {
            "ready": self.is_ready(),
            "loaded": self.is_ready(),
            "error": None,
            "active_model_id": self.active_model_id,
            "active_model_name": meta.name if meta else self.active_model_id,
            "active_model_status": meta.status.value if meta else "UNKNOWN",
            "is_production": self.active_model_id in ["E5", "U2", "CALIBRATION"],
            "loaded_models": list(self._loaded_models.keys()),
            "total_registered_models": len(model_registry.list_all()),
            "e5": {
                "name": "E5_frozen_reference",
                "loaded": "E5" in self._loaded_models,
                "parameters": 135425,
                "input_features": 15,
                "window_size": 50,
                "architecture": "VelocityGravityModel (CNN-GRU)"
            },
            "u2": {
                "name": "U2_decoupled_uncertainty",
                "loaded": "U2" in self._loaded_models,
                "parameters": 10369,
                "latent_dim": 128,
                "architecture": "DecoupledUncertaintyHead (MLP-Softplus)"
            },
            "calibration": self.calibrator.get_info(),
            "sampling_frequency_hz": 10.0,
            "window_duration_seconds": 5.0,
            "total_inferences": self.total_inferences,
            "last_latency_ms": round(self.last_latency_ms, 2),
            "latest_result": self.last_result.to_dict() if self.last_result else None
        }


# Global singleton instance
ml_manager = MLModelManager()

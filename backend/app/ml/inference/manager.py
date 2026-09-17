"""
YatraSaarthi ML - Model Manager & Inference Service
Singleton manager loading E5 (velocity) and U2 (uncertainty) once at startup.
Performs CPU inference and returns calibrated speed and variance.
"""
import json
import time
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any, Optional, Union
import numpy as np
import torch

from app.ml.models.e5_velocity import VelocityGravityModel
from app.ml.models.u2_uncertainty import DecoupledUncertaintyHead
from app.ml.preprocessing.feature_pipeline import FeaturePipeline


@dataclass
class MLInferenceResult:
    velocity_mps: float
    predicted_error_mps: float
    calibrated_sigma_mps: float
    velocity_variance: float
    latency_ms: float
    timestamp: float
    valid: bool = True
    error_message: Optional[str] = None


class MLModelManager:
    """
    Production Model Manager for E5 and U2.
    Loads checkpoints once, validates weights and parameters,
    and runs thread-safe, non-blocking inference.
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
        self.e5_model: Optional[VelocityGravityModel] = None
        self.u2_model: Optional[DecoupledUncertaintyHead] = None
        self.feature_pipeline: Optional[FeaturePipeline] = None

        # Calibration parameters
        self.k: float = 1.9122540606990217
        self.sigma_floor: float = 0.05
        self.calibration_method: str = "scalar"

        # Telemetry & Diagnostics
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None
        self.total_inferences: int = 0
        self.last_inference_time: float = 0.0
        self.last_latency_ms: float = 0.0
        self.last_result: Optional[MLInferenceResult] = None

        self._initialized = True

    def load_models(self) -> bool:
        """
        Load E5, U2, normalization stats, and calibration parameters.
        Validates state dicts strictly.
        """
        try:
            e5_path = self.weights_dir / "e5_best_model.pth"
            u2_path = self.weights_dir / "u2_best_model.pth"
            calib_path = self.weights_dir / "calibration.json"
            norm_path = self.weights_dir / "normalization_stats.json"

            if not e5_path.exists():
                raise FileNotFoundError(f"E5 checkpoint not found at {e5_path}")
            if not u2_path.exists():
                raise FileNotFoundError(f"U2 checkpoint not found at {u2_path}")
            if not calib_path.exists():
                raise FileNotFoundError(f"Calibration JSON not found at {calib_path}")
            if not norm_path.exists():
                raise FileNotFoundError(f"Normalization stats not found at {norm_path}")

            # Load Calibration
            with open(calib_path, "r") as f:
                calib_data = json.load(f)
                params = calib_data.get("calibration_parameters", {})
                self.k = float(params.get("k", 1.9122540606990217))
                self.sigma_floor = float(params.get("sigma_floor", 0.05))
                self.calibration_method = calib_data.get("calibration_method", "scalar")

            # Load Preprocessing Feature Pipeline
            self.feature_pipeline = FeaturePipeline(norm_path)

            # Load E5 Model (15 features)
            self.e5_model = VelocityGravityModel(input_features=15).to(self.device)
            e5_state = torch.load(e5_path, map_location=self.device)
            self.e5_model.load_state_dict(e5_state, strict=True)
            self.e5_model.eval()

            # Load U2 Model (128 latent dimensions)
            self.u2_model = DecoupledUncertaintyHead(latent_dim=128).to(self.device)
            u2_state = torch.load(u2_path, map_location=self.device)
            self.u2_model.load_state_dict(u2_state, strict=True)
            self.u2_model.eval()

            self.is_loaded = True
            self.load_error = None
            print(
                f"[ML] E5 Model (135,425 params) and U2 Head (10,369 params) "
                f"loaded successfully from {self.weights_dir}"
            )
            return True

        except Exception as e:
            self.is_loaded = False
            self.load_error = str(e)
            print(f"[ML] Failed to load models: {e}")
            return False

    def is_ready(self) -> bool:
        """Returns True if both models are loaded and ready for inference."""
        return self.is_loaded and self.e5_model is not None and self.u2_model is not None

    def infer(self, imu_window: Union[np.ndarray, torch.Tensor]) -> MLInferenceResult:
        """
        Perform end-to-end inference on a 50-sample IMU window.
        
        Args:
            imu_window: [50, 6] raw IMU array or tensor
        Returns:
            MLInferenceResult with predicted velocity, uncertainty, and latency.
        """
        now = time.time()
        if not self.is_ready():
            return MLInferenceResult(
                velocity_mps=0.0,
                predicted_error_mps=0.0,
                calibrated_sigma_mps=0.0,
                velocity_variance=0.0,
                latency_ms=0.0,
                timestamp=now,
                valid=False,
                error_message="Models not loaded"
            )

        t_start = time.perf_counter()
        try:
            # 1. Preprocessing into [1, 50, 15]
            x_tensor = self.feature_pipeline.process(imu_window).to(self.device)

            # 2. Forward pass with no_grad
            with torch.no_grad():
                vel_pred, features = self.e5_model(x_tensor, return_features=True)
                err_pred = self.u2_model(features)

            pred_vel = float(vel_pred.item())
            pred_err = float(err_pred.item())

            # 3. Calibration
            sigma = max(self.k * pred_err, self.sigma_floor)
            variance = sigma ** 2

            t_end = time.perf_counter()
            latency_ms = (t_end - t_start) * 1000.0

            self.total_inferences += 1
            self.last_inference_time = now
            self.last_latency_ms = latency_ms

            result = MLInferenceResult(
                velocity_mps=pred_vel,
                predicted_error_mps=pred_err,
                calibrated_sigma_mps=sigma,
                velocity_variance=variance,
                latency_ms=round(latency_ms, 2),
                timestamp=now,
                valid=True
            )
            self.last_result = result
            return result

        except Exception as e:
            t_end = time.perf_counter()
            latency_ms = (t_end - t_start) * 1000.0
            return MLInferenceResult(
                velocity_mps=0.0,
                predicted_error_mps=0.0,
                calibrated_sigma_mps=0.0,
                velocity_variance=0.0,
                latency_ms=round(latency_ms, 2),
                timestamp=now,
                valid=False,
                error_message=str(e)
            )

    def get_status(self) -> Dict[str, Any]:
        """Expose real model diagnostic status for API and UI."""
        return {
            "ready": self.is_ready(),
            "loaded": self.is_loaded,
            "error": self.load_error,
            "e5": {
                "name": "E5_frozen_reference",
                "loaded": self.e5_model is not None,
                "parameters": 135425,
                "input_features": 15,
                "window_size": 50,
                "architecture": "VelocityGravityModel (CNN-GRU)"
            },
            "u2": {
                "name": "U2_decoupled_uncertainty",
                "loaded": self.u2_model is not None,
                "parameters": 10369,
                "latent_dim": 128,
                "architecture": "DecoupledUncertaintyHead (MLP-Softplus)"
            },
            "calibration": {
                "method": self.calibration_method,
                "k": self.k,
                "sigma_floor": self.sigma_floor
            },
            "sampling_frequency_hz": 10.0,
            "window_duration_seconds": 5.0,
            "total_inferences": self.total_inferences,
            "last_inference_timestamp": self.last_inference_time,
            "last_latency_ms": round(self.last_latency_ms, 2),
            "latest_velocity_mps": self.last_result.velocity_mps if self.last_result and self.last_result.valid else None,
            "latest_uncertainty_sigma": self.last_result.calibrated_sigma_mps if self.last_result and self.last_result.valid else None,
            "latest_variance": self.last_result.velocity_variance if self.last_result and self.last_result.valid else None
        }


# Global singleton instance
ml_manager = MLModelManager()

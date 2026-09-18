"""
YatraSaarthi ML - Preprocessing Adapters
Per-model input adapters ensuring each model receives its exact expected channel format:
- 6-channel adapter (E0, E1, E4): Normalized IMU [ax, ay, az, gx, gy, gz]
- 8-channel adapter (E2, E3): 6 normalized IMU + accel_mag + gyro_mag
- 12-channel adapter (E6): Causal gravity alignment [a_grav, a_lin, norms, w_grav, w_norm]
- 15-channel adapter (E5, E7, U0, U1): Physics-aware normalized IMU + gravity/9.81 + lin_acc/2.0 + magnitudes
"""
import json
from pathlib import Path
from typing import Dict, Any, Union, Optional
import numpy as np
import torch

from app.ml.models.e6_alignment import CausalGravityAligner


class ModelInputAdapter:
    """
    Adapter that transforms raw 6-channel IMU windows [50, 6]
    (or [B, 50, 6]) into the exact tensor representation needed by a given model.
    """
    def __init__(self, stats_path: Optional[Union[str, Path]] = None):
        if stats_path is None:
            stats_path = Path(__file__).resolve().parent.parent / "weights" / "normalization_stats.json"
        self.stats_path = Path(stats_path)
        self.means = np.array([0.0, 0.0, 9.81, 0.0, 0.0, 0.0], dtype=np.float32)
        self.stds = np.array([2.0, 2.0, 2.0, 0.5, 0.5, 0.5], dtype=np.float32)
        self.load_stats()
        self.e6_aligner = CausalGravityAligner()

    def load_stats(self):
        if self.stats_path.exists():
            with open(self.stats_path, "r") as f:
                stats = json.load(f)
                mean_dict = stats.get("mean", {})
                std_dict = stats.get("std", {})
                self.means = np.array([
                    mean_dict.get("accel_x", 0.0),
                    mean_dict.get("accel_y", 0.0),
                    mean_dict.get("accel_z", 9.80665),
                    mean_dict.get("gyro_x", 0.0),
                    mean_dict.get("gyro_y", 0.0),
                    mean_dict.get("gyro_z", 0.0)
                ], dtype=np.float32)
                self.stds = np.array([
                    max(std_dict.get("accel_x", 1.0), 1e-4),
                    max(std_dict.get("accel_y", 1.0), 1e-4),
                    max(std_dict.get("accel_z", 1.0), 1e-4),
                    max(std_dict.get("gyro_x", 1.0), 1e-4),
                    max(std_dict.get("gyro_y", 1.0), 1e-4),
                    max(std_dict.get("gyro_z", 1.0), 1e-4)
                ], dtype=np.float32)

    def adapt(self, raw_window: Union[np.ndarray, torch.Tensor], model_id: str) -> torch.Tensor:
        """
        Transforms raw IMU window [50, 6] (or [B, 50, 6])
        into the appropriate tensor for model_id.
        """
        # Ensure numpy array
        if isinstance(raw_window, torch.Tensor):
            arr = raw_window.detach().cpu().numpy()
        else:
            arr = np.asarray(raw_window, dtype=np.float32)

        if arr.ndim == 2:
            arr = np.expand_dims(arr, 0)  # [1, 50, 6]

        B, T, C = arr.shape
        if C != 6:
            raise ValueError(f"Expected 6 IMU channels (accel 3 + gyro 3), got {C}")

        # Model-specific channel transformations
        m_id = model_id.upper()

        if m_id in ["E0", "E1", "E4"]:
            # 6 channels: normalized IMU
            normed = (arr - self.means) / self.stds
            return torch.from_numpy(normed.astype(np.float32))

        elif m_id in ["E2", "E3"]:
            # 8 channels: normalized IMU + accel_mag + gyro_mag
            normed = (arr - self.means) / self.stds
            accel_raw = arr[:, :, 0:3]
            gyro_raw = arr[:, :, 3:6]
            accel_mag = np.linalg.norm(accel_raw, axis=-1, keepdims=True)
            gyro_mag = np.linalg.norm(gyro_raw, axis=-1, keepdims=True)
            combined = np.concatenate([normed, accel_mag, gyro_mag], axis=-1)
            return torch.from_numpy(combined.astype(np.float32))

        elif m_id == "E6":
            # 12 channels: CausalGravityAligner
            t_in = torch.from_numpy(arr.astype(np.float32))
            return self.e6_aligner(t_in)

        elif m_id in ["E5", "E7", "U0", "U1"]:
            # 15 channels: physics-aware gravity + linear accel + magnitudes
            return self._build_15_features(arr)

        else:
            # Default to 15 features for safety
            return self._build_15_features(arr)

    def _build_15_features(self, arr: np.ndarray) -> torch.Tensor:
        """
        Builds the 15-dimensional physics-aware feature tensor matching E5 training:
        - 6 normalized IMU features
        - 3 estimated gravity / 9.81
        - 3 linear acceleration / 2.0
        - 1 linear acceleration magnitude
        - 1 raw acceleration magnitude
        - 1 raw angular velocity magnitude
        """
        B, T, _ = arr.shape
        accel = arr[:, :, 0:3]
        gyro = arr[:, :, 3:6]

        # 1. 6 normalized IMU
        imu_norm = (arr - self.means) / self.stds

        # 2. Causal EMA gravity estimation
        alpha = 0.05
        gravity = np.zeros_like(accel)
        g_t = accel[:, 0, :].copy()
        gravity[:, 0, :] = g_t
        for t in range(1, T):
            g_t = (1.0 - alpha) * g_t + alpha * accel[:, t, :]
            gravity[:, t, :] = g_t

        gravity_feat = gravity / 9.80665

        # 3. Linear acceleration
        lin_acc = accel - gravity
        lin_acc_feat = lin_acc / 2.0

        # 4. Magnitudes
        lin_acc_mag = np.linalg.norm(lin_acc, axis=-1, keepdims=True)
        accel_mag = np.linalg.norm(accel, axis=-1, keepdims=True)
        gyro_mag = np.linalg.norm(gyro, axis=-1, keepdims=True)

        features = np.concatenate([
            imu_norm,
            gravity_feat,
            lin_acc_feat,
            lin_acc_mag,
            accel_mag,
            gyro_mag
        ], axis=-1)

        return torch.from_numpy(features.astype(np.float32))

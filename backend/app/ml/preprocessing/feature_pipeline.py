"""
YatraSaarthi ML - 15-Feature Preprocessing Pipeline
Exact feature extraction pipeline matching E5/U2 training protocol:
- Standardized 6 raw IMU channels (using training-split statistics)
- Causal gravity EMA (alpha=0.02) scaled by 9.81
- Linear acceleration (accel - gravity) scaled by 2.0
- Linear acceleration magnitude normalized
- Total acceleration magnitude normalized
- Total gyroscope magnitude normalized
Total: 15 features per sample.
"""
import json
import os
from pathlib import Path
from typing import Dict, Optional, Union
import numpy as np
import torch


class FeaturePipeline:
    """
    Transforms raw 6-channel IMU windows [T, 6] into the 15-feature tensor [1, T, 15]
    expected by the E5 velocity model.
    """
    def __init__(self, stats_path: Optional[Union[str, Path]] = None):
        if stats_path is None:
            # Default to bundled weights directory
            stats_path = Path(__file__).resolve().parent.parent / "weights" / "normalization_stats.json"

        stats_path = Path(stats_path)
        if not stats_path.exists():
            raise FileNotFoundError(f"Normalization stats file not found at {stats_path}")

        with open(stats_path, "r") as f:
            stats = json.load(f)

        self.mean = np.array([
            stats["accel_x"]["mean"], stats["accel_y"]["mean"], stats["accel_z"]["mean"],
            stats["gyro_x"]["mean"], stats["gyro_y"]["mean"], stats["gyro_z"]["mean"]
        ], dtype=np.float32)

        self.std = np.array([
            stats["accel_x"]["std"], stats["accel_y"]["std"], stats["accel_z"]["std"],
            stats["gyro_x"]["std"], stats["gyro_y"]["std"], stats["gyro_z"]["std"]
        ], dtype=np.float32)

        self.alpha_gravity = 0.02
        self.g_ref = 9.81

    def process(self, imu_window: Union[np.ndarray, torch.Tensor]) -> torch.Tensor:
        """
        Process a raw IMU window into a 15-feature tensor.
        
        Args:
            imu_window: [T, 6] array or tensor with columns:
                        [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
        Returns:
            features: [1, T, 15] torch.FloatTensor
        """
        if isinstance(imu_window, torch.Tensor):
            x_raw = imu_window.detach().cpu().numpy().astype(np.float32)
        else:
            x_raw = np.asarray(imu_window, dtype=np.float32)

        if x_raw.ndim != 2 or x_raw.shape[1] != 6:
            raise ValueError(f"Expected imu_window shape [T, 6], got {x_raw.shape}")

        T = x_raw.shape[0]
        if T < 2:
            raise ValueError(f"Window length too short ({T} samples)")

        # Validate numeric sanity
        if not np.all(np.isfinite(x_raw)):
            raise ValueError("Input IMU data contains NaN or infinite values")

        # 1. Standardize raw 6 channels: (x - mean) / (std + 1e-6)
        x_norm = (x_raw - self.mean) / (self.std + 1e-6)

        # 2. Causal Gravity EMA
        accel = x_raw[:, 0:3]
        gyro = x_raw[:, 3:6]
        gravity = np.zeros_like(accel)
        gravity[0] = accel[0]
        for i in range(1, T):
            gravity[i] = self.alpha_gravity * accel[i] + (1.0 - self.alpha_gravity) * gravity[i - 1]

        # 3. Linear acceleration
        linear_accel = accel - gravity

        # 4. Magnitudes
        lin_acc_mag = np.sqrt(np.sum(linear_accel ** 2, axis=1, keepdims=True))
        accel_mag = np.sqrt(np.sum(accel ** 2, axis=1, keepdims=True))
        gyro_mag = np.sqrt(np.sum(gyro ** 2, axis=1, keepdims=True))

        # Scaling matching dataset.py protocol:
        # gravity / 9.81
        gravity_feat = gravity / self.g_ref
        # linear_accel / 2.0
        lin_acc_feat = linear_accel / 2.0
        # (lin_acc_mag - 1.0) / 2.0
        lin_mag_feat = (lin_acc_mag - 1.0) / 2.0
        # (accel_mag - 10.0) / 1.0
        acc_mag_feat = (accel_mag - 10.0) / 1.0
        # (gyro_mag - 0.2) / 0.2
        gyro_mag_feat = (gyro_mag - 0.2) / 0.2

        # 5. Concatenate all 15 features:
        # [x_norm(6), gravity_feat(3), lin_acc_feat(3), lin_mag_feat(1), acc_mag_feat(1), gyro_mag_feat(1)]
        features_15 = np.concatenate([
            x_norm,
            gravity_feat,
            lin_acc_feat,
            lin_mag_feat,
            acc_mag_feat,
            gyro_mag_feat
        ], axis=1)

        # Convert to torch tensor: [1, T, 15]
        tensor = torch.from_numpy(features_15).unsqueeze(0).to(dtype=torch.float32)
        return tensor

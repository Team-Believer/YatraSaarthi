"""
YatraSaarthi ML - E6 Phone->Vehicle Alignment Module
Module: CausalGravityAligner
Causally estimates gravity orientation using an Exponential Moving Average (EMA)
and applies Rodrigues rotation to align device coordinate frame with gravity ([0, 0, 1]).
Produces 12 gravity-aligned features: [a_grav(3), a_lin(3), a_norm(1), a_xy_norm(1), w_grav(3), w_norm(1)].
Status: EXPERIMENTAL / DEGRADED (Unnormalized training flaw diagnosed in Phase 25 audit).
Preserved for diagnostics, research, and coordinate alignment analysis.
"""
import torch
import torch.nn as nn


class CausalGravityAligner(nn.Module):
    def __init__(self, alpha: float = 0.01, gravity_norm: float = 9.80665):
        """
        Causally estimates gravity and rotates IMU readings into gravity frame.
        alpha: EMA smoothing parameter for gravity estimation.
        gravity_norm: Standard gravity magnitude in m/s^2.
        """
        super().__init__()
        self.alpha = alpha
        self.gravity_norm = gravity_norm

    def get_rotation_matrix(self, vec1: torch.Tensor, vec2: torch.Tensor) -> torch.Tensor:
        """
        Calculates rotation matrix aligning vec1 to vec2 via Rodrigues rotation formula.
        vec1: [..., 3]
        vec2: [..., 3]
        Returns: [..., 3, 3] rotation matrix
        """
        a = vec1 / (torch.norm(vec1, dim=-1, keepdim=True) + 1e-8)
        if vec2.dim() == 1:
            b = vec2.view(*(1 for _ in range(a.dim() - 1)), 3).expand_as(a)
        else:
            b = vec2 / (torch.norm(vec2, dim=-1, keepdim=True) + 1e-8)

        v = torch.cross(a, b, dim=-1)
        c = (a * b).sum(dim=-1, keepdim=True).unsqueeze(-1)
        s = torch.norm(v, dim=-1)

        I = torch.eye(3, device=a.device, dtype=a.dtype)
        I = I.view(*(1 for _ in range(a.dim() - 1)), 3, 3).expand(*a.shape[:-1], 3, 3)

        z = torch.zeros_like(v[..., 0])
        K = torch.stack([
            torch.stack([z, -v[..., 2], v[..., 1]], dim=-1),
            torch.stack([v[..., 2], z, -v[..., 0]], dim=-1),
            torch.stack([-v[..., 1], v[..., 0], z], dim=-1)
        ], dim=-2)

        s2_clamped = torch.clamp(s**2, min=1e-8).unsqueeze(-1).unsqueeze(-1)
        K_square = torch.matmul(K, K)
        factor = (1.0 - c) / s2_clamped

        R = I + K + K_square * factor

        is_parallel = (s < 1e-5).unsqueeze(-1).unsqueeze(-1).expand_as(R)
        c_val = (a * b).sum(dim=-1)
        is_antiparallel = ((s < 1e-5) & (c_val < 0)).unsqueeze(-1).unsqueeze(-1).expand_as(R)

        R = torch.where(is_parallel, I, R)
        R = torch.where(is_antiparallel, -I, R)
        return R

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: [B, T, 6] or [T, 6] tensor (accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z)
        Returns: [B, T, 12] gravity-aligned features
        """
        single_batch = False
        if x.dim() == 2:
            single_batch = True
            x = x.unsqueeze(0)

        B, T, _ = x.shape
        accel = x[..., 0:3]
        gyro = x[..., 3:6]

        # 1. Causal Gravity Estimation using EMA
        gravity_est = torch.zeros_like(accel)
        g_t = accel[:, 0, :]
        gravity_est[:, 0, :] = g_t

        for t in range(1, T):
            g_t = (1.0 - self.alpha) * g_t + self.alpha * accel[:, t, :]
            gravity_est[:, t, :] = g_t

        # 2. Rotation matrix to [0, 0, 1]
        target_gravity = torch.tensor([0.0, 0.0, 1.0], device=x.device, dtype=x.dtype)
        R_grav = self.get_rotation_matrix(gravity_est, target_gravity)

        # 3. Rotate accel and gyro
        a_grav = torch.matmul(R_grav, accel.unsqueeze(-1)).squeeze(-1)
        w_grav = torch.matmul(R_grav, gyro.unsqueeze(-1)).squeeze(-1)

        # 4. Linear acceleration (subtract gravity vector)
        g_vec = torch.tensor([0.0, 0.0, self.gravity_norm], device=x.device, dtype=x.dtype)
        a_lin = a_grav - g_vec

        # 5. Magnitudes
        accel_norm = torch.norm(accel, dim=-1, keepdim=True)
        accel_xy_norm = torch.norm(a_grav[..., 0:2], dim=-1, keepdim=True)
        gyro_norm = torch.norm(gyro, dim=-1, keepdim=True)

        features = torch.cat([
            a_grav,
            a_lin,
            accel_norm,
            accel_xy_norm,
            w_grav,
            gyro_norm
        ], dim=-1)

        if single_batch:
            return features.squeeze(0)
        return features

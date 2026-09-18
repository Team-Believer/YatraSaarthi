"""
YatraSaarthi ML - U1 Joint Mean + Variance Uncertainty Model
Architecture: 1D CNN + GRU with 2-output FC head predicting [mean_velocity, log_variance].
Trained with Gaussian Negative Log-Likelihood (Heteroscedastic Loss).
Inputs: 15 physics-aware channels.
Parameters: 135,876.
Status: EXPERIMENTAL / FAILED (Joint mean-variance training degraded velocity accuracy: RMSE 5.78 m/s vs 3.95 m/s in E5).
Preserved for diagnostics, uncertainty research, and ablation.
"""
import torch
import torch.nn as nn
from typing import Tuple, Union


class VelocityUncertaintyModel(nn.Module):
    def __init__(
        self,
        input_features: int = 15,
        log_var_min: float = -6.0,
        log_var_max: float = 4.0
    ):
        super().__init__()
        self.input_features = input_features
        self.log_var_min = log_var_min
        self.log_var_max = log_var_max

        self.cnn = nn.Sequential(
            nn.Conv1d(input_features, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Conv1d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm1d(128),
            nn.GELU()
        )
        self.gru = nn.GRU(128, 128, 1, batch_first=True)
        # 2 outputs: index 0 = velocity mean, index 1 = log_variance
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 2)
        )

    def forward(
        self, x: torch.Tensor, return_features: bool = False
    ) -> Union[Tuple[torch.Tensor, torch.Tensor], Tuple[torch.Tensor, torch.Tensor, torch.Tensor]]:
        """
        Args:
            x: [B, T, 15] or [T, 15]
        Returns:
            mean: [B] predicted velocity (m/s)
            log_var: [B] clamped log-variance
            features (optional): [B, 128] latent representations
        """
        if x.dim() == 2:
            x = x.unsqueeze(0)

        x_cnn = x.transpose(1, 2)
        x_conv = self.cnn(x_cnn)
        x_gru = x_conv.transpose(1, 2)
        out, _ = self.gru(x_gru)

        features = out[:, -1, :]
        raw_out = self.fc(features)

        mean = raw_out[:, 0]
        log_var = torch.clamp(raw_out[:, 1], min=self.log_var_min, max=self.log_var_max)

        if return_features:
            return mean, log_var, features
        return mean, log_var

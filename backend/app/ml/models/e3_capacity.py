"""
YatraSaarthi ML - E3 Capacity Ablation Model
Architecture: 1D CNN with Residual Block + GRU + Regressor.
Inputs: 8 channels (6 normalized IMU + accel_mag + gyro_mag).
Parameters: 159,685.
Status: FAILED / DEGRADED (Generalization R2 = -1.00 on unseen driver).
Preserved for diagnostics, ablation, and benchmarking.
"""
import torch
import torch.nn as nn
from typing import Tuple, Union


class ResidualBlock(nn.Module):
    def __init__(self, channels: int = 64):
        super().__init__()
        self.conv1 = nn.Conv1d(channels, channels, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(channels)
        self.gelu = nn.GELU()
        self.conv2 = nn.Conv1d(channels, channels, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.gelu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out += residual
        out = self.gelu(out)
        return out


class VelocityRobustModel(nn.Module):
    def __init__(self, input_features: int = 8):
        super().__init__()
        self.input_features = input_features
        self.cnn_in = nn.Sequential(
            nn.Conv1d(in_channels=input_features, out_channels=64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.GELU()
        )
        self.res_block = ResidualBlock(64)
        self.cnn_out = nn.Sequential(
            nn.Conv1d(in_channels=64, out_channels=128, kernel_size=3, padding=1),
            nn.BatchNorm1d(128),
            nn.GELU()
        )
        self.gru = nn.GRU(input_size=128, hidden_size=128, num_layers=1, batch_first=True)
        self.regressor = nn.Sequential(
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 1)
        )

    def forward(
        self, x: torch.Tensor, return_features: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        if x.dim() == 2:
            x = x.unsqueeze(0)
        x = x.transpose(1, 2)
        x = self.cnn_in(x)
        x = self.res_block(x)
        x = self.cnn_out(x)
        x = x.transpose(1, 2)
        out, _ = self.gru(x)
        last_timestep = out[:, -1, :]
        velocity = self.regressor(last_timestep).squeeze(-1)
        if return_features:
            return velocity, last_timestep
        return velocity

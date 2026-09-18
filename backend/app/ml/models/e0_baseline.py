"""
YatraSaarthi ML - E0 Baseline Velocity Model
Architecture: 1D CNN (kernel=5, 2 layers) + GRU (1 layer) + 2-layer regression head.
Input: 6 channels (accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z).
Parameter count: 151,235.
Designation: REFERENCE / BASELINE.
"""
import torch
import torch.nn as nn
from typing import Tuple, Union


class VelocityBaselineModel(nn.Module):
    def __init__(self, input_features: int = 6):
        super().__init__()
        self.input_features = input_features
        
        # 1D CNN block
        # Input shape: [B, C, T]
        self.conv_block = nn.Sequential(
            nn.Conv1d(in_channels=input_features, out_channels=64, kernel_size=5, padding=2),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Conv1d(in_channels=64, out_channels=128, kernel_size=5, padding=2),
            nn.BatchNorm1d(128),
            nn.GELU()
        )
        
        # GRU block
        self.gru = nn.GRU(
            input_size=128,
            hidden_size=128,
            num_layers=1,
            batch_first=True
        )
        
        # Regression head
        self.regression_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 1)
        )
        
    def forward(
        self, x: torch.Tensor, return_features: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """
        x: [B, T, 6] or [T, 6]
        """
        if x.dim() == 2:
            x = x.unsqueeze(0)
            
        # Transpose for CNN: [B, T, 6] -> [B, 6, T]
        x_cnn = x.transpose(1, 2)
        x_feat = self.conv_block(x_cnn)
        
        # Transpose for GRU: [B, 128, T] -> [B, T, 128]
        x_gru = x_feat.transpose(1, 2)
        out, _ = self.gru(x_gru)
        
        # Extract final timestep: [B, 128]
        final_timestep = out[:, -1, :]
        
        # Regression head: [B, 128] -> [B, 1]
        vel_pred = self.regression_head(final_timestep).squeeze(-1)
        
        if return_features:
            return vel_pred, final_timestep
        return vel_pred

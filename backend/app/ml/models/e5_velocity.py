"""
YatraSaarthi ML - E5 Physics-Aware Velocity Model
Architecture: 1D CNN (2 layers) + GRU (1 layer) + MLP regressor.
Trained on 15 physics & magnitude engineered features.
Checkpoint: experiments/E5_frozen_reference/best_model.pth (135,425 trainable params).
"""
import torch
import torch.nn as nn
from typing import Tuple, Union


class VelocityGravityModel(nn.Module):
    """
    E5 Velocity Model for AI-assisted dead reckoning forward velocity estimation.
    """
    def __init__(self, input_features: int = 15):
        super().__init__()
        self.input_features = input_features
        self.cnn = nn.Sequential(
            nn.Conv1d(input_features, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Conv1d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm1d(128),
            nn.GELU()
        )
        self.gru = nn.GRU(128, 128, 1, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 1)
        )

    def forward(
        self, x: torch.Tensor, return_features: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """
        Forward pass.
        
        Args:
            x: Tensor of shape [B, T, 15] or [T, 15]
            return_features: When True, returns (vel_pred, latent_features) where
                             latent_features has shape [B, 128].
        Returns:
            vel_pred: [B] scalar forward velocity in m/s
            features (optional): [B, 128] GRU latent representations
        """
        if x.dim() == 2:
            x = x.unsqueeze(0)

        # [B, T, C] -> [B, C, T]
        x_cnn = x.transpose(1, 2)
        x_conv = self.cnn(x_cnn)

        # [B, C, T] -> [B, T, 128]
        x_gru = x_conv.transpose(1, 2)
        out, _ = self.gru(x_gru)

        # Final timestep representation [B, 128]
        features = out[:, -1, :]

        # Velocity regression [B]
        vel_pred = self.fc(features).squeeze(-1)

        if return_features:
            return vel_pred, features
        return vel_pred

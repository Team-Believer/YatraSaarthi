"""
YatraSaarthi ML - E4 Speed Robustness Ablation Model
Architecture: 1D CNN (kernel=3, 2 layers) + GRU (1 layer) + FC regressor.
Inputs: 6 channels (normalized raw IMU).
Trained with Speed-Balanced Sampler (mitigating low-speed dataset imbalance).
Parameters: 134,083.
Status: DIAGNOSTIC / ROBUSTNESS (Primary RMSE=4.45 m/s, Unseen RMSE=7.00 m/s).
Preserved for diagnostics, ablation, and robustness benchmarking.
"""
import torch
import torch.nn as nn
from typing import Tuple, Union


class AdaptiveVelocityBaselineModel(nn.Module):
    def __init__(self, in_feat: int = 6):
        super().__init__()
        self.in_feat = in_feat
        self.cnn = nn.Sequential(
            nn.Conv1d(in_feat, 64, 3, padding=1),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Conv1d(64, 128, 3, padding=1),
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
        if x.dim() == 2:
            x = x.unsqueeze(0)
        x = x.transpose(1, 2)
        x = self.cnn(x)
        x = x.transpose(1, 2)
        out, _ = self.gru(x)
        features = out[:, -1, :]
        vel_pred = self.fc(features).squeeze(-1)
        if return_features:
            return vel_pred, features
        return vel_pred

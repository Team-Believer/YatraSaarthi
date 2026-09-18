"""
YatraSaarthi ML - E7 Combined Ablation Model (E4 Speed + E5 Physics)
Architecture: 1D CNN (kernel=3, 2 layers) + GRU (1 layer) + FC regressor.
Inputs: 15 physics-aware channels.
Trained with Speed-Balanced Sampler + Physics Gravity-Aware features.
Parameters: 135,811.
Status: EXPERIMENTAL / ABLATION (Primary RMSE=4.48 m/s, Unseen RMSE=7.38 m/s).
Preserved for diagnostics, ablation, and benchmarking.
"""
import torch
import torch.nn as nn
from typing import Tuple, Union
from app.ml.models.e5_velocity import VelocityGravityModel


class CombinedVelocityModel(VelocityGravityModel):
    """
    E7 Combined Model subclassing VelocityGravityModel.
    Accepts 15 physics & magnitude engineered features.
    """
    def __init__(self, input_features: int = 15):
        super().__init__(input_features=input_features)

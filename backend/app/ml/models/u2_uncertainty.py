"""
YatraSaarthi ML - U2 Decoupled Uncertainty Head
Architecture: 3-layer MLP with Softplus output.
Input: 128-dimensional latent representation from E5 GRU.
Checkpoint: experiments/U2_decoupled_uncertainty/best_model.pth (10,369 params).
"""
import torch
import torch.nn as nn


class DecoupledUncertaintyHead(nn.Module):
    """
    Decoupled uncertainty head estimating the absolute velocity prediction error.
    """
    def __init__(self, latent_dim: int = 128):
        super().__init__()
        self.latent_dim = latent_dim
        self.mlp = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.GELU(),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Linear(32, 1)
        )
        self.softplus = nn.Softplus()

    def forward(self, latent_features: torch.Tensor) -> torch.Tensor:
        """
        Args:
            latent_features: Tensor of shape [B, 128]
        Returns:
            predicted_error: Tensor of shape [B] in m/s (strictly positive via softplus + 1e-3)
        """
        out = self.mlp(latent_features)
        return self.softplus(out).squeeze(-1) + 1e-3

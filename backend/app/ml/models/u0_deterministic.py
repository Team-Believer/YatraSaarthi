"""
YatraSaarthi ML - U0 Formal Deterministic Baseline Model
Architecture: 1D CNN (kernel=3, 2 layers) + GRU (1 layer) + FC regressor.
Inputs: 15 physics-aware channels.
Parameters: 135,811.
Status: REFERENCE / BASELINE (Primary RMSE=3.95 m/s, Primary MAE=2.92 m/s).
Serves as the deterministic reference for uncertainty evaluations.
"""
from app.ml.models.e5_velocity import VelocityGravityModel


class U0DeterministicModel(VelocityGravityModel):
    """
    U0 Deterministic Model for baseline comparison against uncertainty models.
    """
    def __init__(self, input_features: int = 15):
        super().__init__(input_features=input_features)

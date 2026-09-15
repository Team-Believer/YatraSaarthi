"""
YatraSaarthi ML - Model Registry & Service

Manages ML model lifecycle. Reports actual loaded model state.
If no neural checkpoint is loaded, honestly reports 
"Using classical baseline (no trained neural checkpoint loaded)".
"""
from typing import Dict, Optional
from app.ml.baseline import (
    KinematicVelocityEstimator,
    PhysicsCovarianceAdapter,
    StatisticalMotionClassifier
)


class ModelRegistry:
    """Registry of available ML models and their metadata."""
    
    def __init__(self):
        self._models: Dict[str, dict] = {}
        self._register_defaults()
    
    def _register_defaults(self):
        self._models["velocity_estimator"] = {
            "name": "KinematicVelocityEstimator",
            "type": "classical_baseline",
            "version": "1.0.0",
            "description": "Physics-based kinematic integration",
            "neural_checkpoint": None,
            "instance": KinematicVelocityEstimator()
        }
        self._models["covariance_adapter"] = {
            "name": "PhysicsCovarianceAdapter",
            "type": "classical_baseline",
            "version": "1.0.0",
            "description": "Innovation-monitoring process noise adapter",
            "neural_checkpoint": None,
            "instance": PhysicsCovarianceAdapter()
        }
        self._models["motion_classifier"] = {
            "name": "StatisticalMotionClassifier",
            "type": "classical_baseline",
            "version": "1.0.0",
            "description": "Statistical feature-based motion classification",
            "neural_checkpoint": None,
            "instance": StatisticalMotionClassifier()
        }
    
    def get_model(self, name: str):
        entry = self._models.get(name)
        return entry["instance"] if entry else None
    
    def get_status(self) -> dict:
        status = {}
        for key, entry in self._models.items():
            status[key] = {
                "name": entry["name"],
                "type": entry["type"],
                "version": entry["version"],
                "description": entry["description"],
                "neural_checkpoint_loaded": entry["neural_checkpoint"] is not None,
                "checkpoint_path": entry["neural_checkpoint"],
            }
        return status


class ModelService:
    """Provides ML model instances to the IDR engine."""
    
    def __init__(self):
        self.registry = ModelRegistry()
    
    @property
    def velocity_estimator(self) -> KinematicVelocityEstimator:
        return self.registry.get_model("velocity_estimator")
    
    @property
    def covariance_adapter(self) -> PhysicsCovarianceAdapter:
        return self.registry.get_model("covariance_adapter")
    
    @property
    def motion_classifier(self) -> StatisticalMotionClassifier:
        return self.registry.get_model("motion_classifier")
    
    def get_status(self) -> dict:
        return {
            "service": "ModelService",
            "models": self.registry.get_status(),
            "message": "Using classical baseline estimators (no trained neural checkpoints loaded)"
        }

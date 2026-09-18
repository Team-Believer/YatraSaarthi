"""
YatraSaarthi API v1 - AI/ML Model Endpoints
Exposes endpoints for:
- Listing all 12 registered models (E0-E7, U0-U2, Calibration)
- Model inspection and metadata retrieval
- Active model selection for live navigation
- Real inference on arbitrary IMU windows
- Multi-model comparative benchmarking
- Real-time diagnostics and telemetry
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import numpy as np

from app.ml.registry import model_registry
from app.ml.inference.manager import ml_manager

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


class SelectModelRequest(BaseModel):
    model_id: str = Field(..., description="ID of model to select: E0-E7, U0-U2, or Calibration")


class InferRequest(BaseModel):
    model_id: Optional[str] = Field(None, description="Optional model_id; defaults to active model")
    window: Optional[List[List[float]]] = Field(
        None,
        description="Optional 50-sample IMU window [50, 6]: [ax, ay, az, gx, gy, gz]"
    )


@router.get("/status")
def get_ml_status():
    """
    Get real-time loading, active model, and diagnostic status of ML Manager.
    """
    return ml_manager.get_status()


@router.get("/models")
def list_models():
    """
    List all 12 registered models with honest status tags, architecture, parameters, and metrics.
    """
    return {
        "active_model_id": ml_manager.active_model_id,
        "models": model_registry.list_all()
    }


@router.get("/models/{model_id}")
def get_model_details(model_id: str):
    """
    Get detailed specifications, capabilities, and limitations for a specific model.
    """
    meta = model_registry.get_model_metadata(model_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found in registry."
        )
    return {
        "model_id": meta.model_id,
        "name": meta.name,
        "version": meta.version,
        "status": meta.status.value,
        "architecture": meta.architecture,
        "input_channels": meta.input_channels,
        "input_description": meta.input_description,
        "output_description": meta.output_description,
        "output_units": meta.output_units,
        "parameters": meta.parameters,
        "weights_file": meta.weights_file,
        "runtime": meta.runtime,
        "window_samples": meta.window_samples,
        "sampling_rate_hz": meta.sampling_rate_hz,
        "primary_rmse_mps": meta.primary_rmse_mps,
        "unseen_rmse_mps": meta.unseen_rmse_mps,
        "primary_mae_mps": meta.primary_mae_mps,
        "primary_r2": meta.primary_r2,
        "capabilities": meta.capabilities,
        "limitations": meta.limitations,
        "is_active": ml_manager.active_model_id == meta.model_id,
        "is_loaded": meta.model_id in ml_manager._loaded_models
    }


@router.post("/select")
def select_active_model(req: SelectModelRequest):
    """
    Switch the active velocity/uncertainty model used by live navigation.
    """
    try:
        success = ml_manager.select_model(req.model_id)
        return {
            "success": success,
            "active_model_id": ml_manager.active_model_id,
            "status": ml_manager.get_status()
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to switch model: {e}"
        )


@router.post("/infer")
def run_model_inference(req: InferRequest):
    """
    Run inference on an IMU window using the selected or specified model.
    """
    if req.window is not None:
        window_arr = np.array(req.window, dtype=np.float32)
        if window_arr.shape != (50, 6):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expected window shape [50, 6], got {list(window_arr.shape)}"
            )
    else:
        # Generate nominal realistic 5s window
        t = np.linspace(0, 5, 50)
        ax = 0.5 + 0.1 * np.sin(2 * np.pi * 0.5 * t)
        ay = 0.05 * np.cos(2 * np.pi * 0.3 * t)
        az = 9.81 + 0.05 * np.sin(2 * np.pi * 1.0 * t)
        gx = 0.01 * np.sin(t)
        gy = 0.01 * np.cos(t)
        gz = 0.02 * np.sin(0.5 * t)
        window_arr = np.column_stack([ax, ay, az, gx, gy, gz]).astype(np.float32)

    res = ml_manager.infer(window_arr, model_id=req.model_id)
    if not res.valid:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.error_message or "Inference failed"
        )
    return res.to_dict()


@router.post("/benchmark")
def run_multi_model_benchmark():
    """
    Evaluates all 12 models on the exact same 50-sample sensor sequence
    and returns comparative latency, predicted velocity, and test metrics.
    """
    return ml_manager.benchmark_all()

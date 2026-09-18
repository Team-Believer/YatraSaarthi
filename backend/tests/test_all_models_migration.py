"""
Comprehensive Migration & Verification Test Suite for All 12 AI/ML Models:
E0, E1, E2, E3, E4, E5, E6, E7, U0, U1, U2, and Calibration.

Verifies:
1. Complete Model Registry metadata, parameters, and honest status tags.
2. Exact checkpoint loading and parameter counts for each model.
3. Preprocessing adapters: 6-ch, 8-ch, 12-ch, and 15-ch transformations.
4. Forward pass and inference sanity across every model variant.
5. Dynamic model switching via MLModelManager.select_model().
6. Comparative multi-model benchmark evaluation on identical IMU data.
7. Calibration component accuracy and parameter persistence.
8. FastAPI endpoints: /models, /models/{id}, /select, /infer, /benchmark, /status.
9. Integration with InEKF state propagation and navigation engine.
"""
from pathlib import Path
import json
import numpy as np
import pytest
import torch
from fastapi.testclient import TestClient

from app.main import app
from app.ml.registry import model_registry, ModelStatus
from app.ml.inference.manager import ml_manager
from app.ml.preprocessing.adapters import ModelInputAdapter
from app.ml.models.calibration import DecileScalarCalibrator
from app.services.navigation_engine import NavigationSessionEngine
from app.idr.enums import NavigationMode


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def sample_imu_window():
    """Generates a realistic 5-second 10Hz driving window [50, 6]."""
    t = np.linspace(0, 5, 50)
    ax = 0.4 + 0.1 * np.sin(2 * np.pi * 0.5 * t)
    ay = 0.05 * np.cos(2 * np.pi * 0.3 * t)
    az = 9.80665 + 0.05 * np.sin(2 * np.pi * 1.0 * t)
    gx = 0.01 * np.sin(t)
    gy = 0.01 * np.cos(t)
    gz = 0.02 * np.sin(0.5 * t)
    return np.column_stack([ax, ay, az, gx, gy, gz]).astype(np.float32)


# =====================================================================
# 1. MODEL REGISTRY TESTS
# =====================================================================

def test_registry_contains_all_12_models():
    """Ensure all 12 required model IDs are registered with proper metadata."""
    expected_models = ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "U0", "U1", "U2", "CALIBRATION"]
    all_models = model_registry.list_all()
    assert len(all_models) == 12, f"Expected 12 models in registry, found {len(all_models)}"

    registered_ids = [m["model_id"].upper() for m in all_models]
    for mid in expected_models:
        assert mid in registered_ids, f"Model {mid} missing from registry"


def test_registry_honest_status_designations():
    """Ensure failed models are strictly tagged as FAILED/DEGRADED and only validated as PRODUCTION."""
    e5 = model_registry.get_model_metadata("E5")
    assert e5.status == ModelStatus.PRODUCTION_VALIDATED

    u2 = model_registry.get_model_metadata("U2")
    assert u2.status == ModelStatus.PRODUCTION_VALIDATED

    cal = model_registry.get_model_metadata("CALIBRATION")
    assert cal.status == ModelStatus.PRODUCTION_VALIDATED

    e0 = model_registry.get_model_metadata("E0")
    assert e0.status == ModelStatus.REFERENCE_BASELINE

    u0 = model_registry.get_model_metadata("U0")
    assert u0.status == ModelStatus.REFERENCE_BASELINE

    e4 = model_registry.get_model_metadata("E4")
    assert e4.status == ModelStatus.DIAGNOSTIC_ROBUSTNESS

    e1 = model_registry.get_model_metadata("E1")
    assert e1.status == ModelStatus.EXPERIMENTAL_FAILED

    e2 = model_registry.get_model_metadata("E2")
    assert e2.status == ModelStatus.EXPERIMENTAL_FAILED

    e3 = model_registry.get_model_metadata("E3")
    assert e3.status == ModelStatus.EXPERIMENTAL_FAILED

    e6 = model_registry.get_model_metadata("E6")
    assert e6.status == ModelStatus.EXPERIMENTAL_FAILED

    u1 = model_registry.get_model_metadata("U1")
    assert u1.status == ModelStatus.EXPERIMENTAL_FAILED


# =====================================================================
# 2. PREPROCESSING ADAPTER TESTS
# =====================================================================

def test_preprocessing_adapters_shapes(sample_imu_window):
    """Verify input adapters output exact expected tensor shapes for each model category."""
    adapter = ModelInputAdapter()

    # 6-channel models
    for mid in ["E0", "E1", "E4"]:
        t6 = adapter.adapt(sample_imu_window, mid)
        assert isinstance(t6, torch.Tensor)
        assert t6.shape == (1, 50, 6)
        assert torch.isfinite(t6).all()

    # 8-channel models (with magnitude)
    for mid in ["E2", "E3"]:
        t8 = adapter.adapt(sample_imu_window, mid)
        assert isinstance(t8, torch.Tensor)
        assert t8.shape == (1, 50, 8)
        assert torch.isfinite(t8).all()

    # 12-channel model (CausalGravityAligner)
    t12 = adapter.adapt(sample_imu_window, "E6")
    assert isinstance(t12, torch.Tensor)
    assert t12.shape == (1, 50, 12)
    assert torch.isfinite(t12).all()

    # 15-channel models (physics-aware)
    for mid in ["E5", "E7", "U0", "U1"]:
        t15 = adapter.adapt(sample_imu_window, mid)
        assert isinstance(t15, torch.Tensor)
        assert t15.shape == (1, 50, 15)
        assert torch.isfinite(t15).all()


# =====================================================================
# 3. INDIVIDUAL MODEL LOADING & INFERENCE
# =====================================================================

@pytest.mark.parametrize("model_id,expected_params", [
    ("E0", 150849),
    ("E1", 133697),
    ("E2", 134081),
    ("E3", 159041),
    ("E4", 133697),
    ("E5", 135425),
    ("E7", 135425),
    ("U0", 135425),
    ("U1", 135490),
    ("U2", 10369),
])
def test_model_loading_and_parameter_count(model_id, expected_params):
    """Verify each model loads from disk with exact parameters."""
    inst = ml_manager._load_model_instance(model_id)
    assert inst is not None
    param_count = sum(p.numel() for p in inst.parameters())
    assert param_count == expected_params, f"Model {model_id}: expected {expected_params} params, got {param_count}"


def test_all_models_inference_execution(sample_imu_window):
    """Execute inference for all 12 models and verify output physical validity."""
    for mid in ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "U0", "U1", "U2"]:
        res = ml_manager.infer(sample_imu_window, model_id=mid)
        assert res.valid is True, f"Model {mid} inference failed: {res.error_message}"
        assert res.velocity_mps >= 0.0, f"Model {mid} predicted negative velocity: {res.velocity_mps}"
        assert res.velocity_variance >= 0.0, f"Model {mid} negative variance: {res.velocity_variance}"
        assert res.latency_ms > 0.0, f"Model {mid} latency invalid: {res.latency_ms}"


# =====================================================================
# 4. CALIBRATION ACCURACY TESTS
# =====================================================================

def test_calibration_component():
    """Verify scalar decile calibration parameters and formula."""
    cal = ml_manager.calibrator
    assert abs(cal.k - 1.912254) < 1e-4
    assert abs(cal.sigma_floor - 0.05) < 1e-4

    # When error is 0, floor must apply
    sig_floor, var_floor = cal.calibrate(0.0)
    assert sig_floor == 0.05
    assert abs(var_floor - 0.0025) < 1e-6

    # When error is 2.0 m/s
    sig_2, var_2 = cal.calibrate(2.0)
    assert abs(sig_2 - 2.0 * cal.k) < 1e-5
    assert abs(var_2 - sig_2**2) < 1e-5


# =====================================================================
# 5. MODEL SWITCHING & BENCHMARK TESTS
# =====================================================================

def test_model_selection_and_telemetry(sample_imu_window):
    """Verify switching active model dynamically changes active state and telemetry."""
    # Switch to E0
    assert ml_manager.select_model("E0") is True
    assert ml_manager.active_model_id == "E0"
    res_e0 = ml_manager.infer(sample_imu_window)
    assert res_e0.model_id == "E0"
    assert res_e0.model_status == ModelStatus.REFERENCE_BASELINE.value

    # Switch to E4
    assert ml_manager.select_model("E4") is True
    assert ml_manager.active_model_id == "E4"
    res_e4 = ml_manager.infer(sample_imu_window)
    assert res_e4.model_id == "E4"
    assert res_e4.model_status == ModelStatus.DIAGNOSTIC_ROBUSTNESS.value

    # Switch back to production E5
    assert ml_manager.select_model("E5") is True
    assert ml_manager.active_model_id == "E5"
    res_e5 = ml_manager.infer(sample_imu_window)
    assert res_e5.model_id == "E5"
    assert res_e5.model_status == ModelStatus.PRODUCTION_VALIDATED.value


def test_multi_model_benchmark(sample_imu_window):
    """Verify benchmark runs across all models and returns comparative stats."""
    bm = ml_manager.benchmark_all(sample_imu_window)
    assert bm["models_evaluated"] == 11
    assert len(bm["results"]) == 11
    for item in bm["results"]:
        assert item["valid"] is True
        assert item["velocity_mps"] >= 0.0
        assert item["latency_ms"] >= 0.0


# =====================================================================
# 6. FASTAPI API ENDPOINTS TESTS
# =====================================================================

def test_api_list_models(client):
    """GET /api/v1/ml/models returns all 12 models."""
    r = client.get("/api/v1/ml/models")
    assert r.status_code == 200
    data = r.json()
    assert "active_model_id" in data
    assert "models" in data
    assert len(data["models"]) == 12


def test_api_get_model_details(client):
    """GET /api/v1/ml/models/{id} returns full metadata."""
    r = client.get("/api/v1/ml/models/E5")
    assert r.status_code == 200
    data = r.json()
    assert data["model_id"] == "E5"
    assert data["status"] == "PRODUCTION / VALIDATED"
    assert data["parameters"] == 135425
    assert data["primary_r2"] == 0.763

    # Unknown model 404
    r_err = client.get("/api/v1/ml/models/UNKNOWN_99")
    assert r_err.status_code == 404


def test_api_select_model(client):
    """POST /api/v1/ml/select switches model."""
    r = client.post("/api/v1/ml/select", json={"model_id": "E4"})
    assert r.status_code == 200
    assert r.json()["active_model_id"] == "E4"

    # Reset to E5
    r_reset = client.post("/api/v1/ml/select", json={"model_id": "E5"})
    assert r_reset.status_code == 200
    assert r_reset.json()["active_model_id"] == "E5"


def test_api_infer(client):
    """POST /api/v1/ml/infer runs real inference."""
    r = client.post("/api/v1/ml/infer", json={"model_id": "E5"})
    assert r.status_code == 200
    data = r.json()
    assert data["valid"] is True
    assert data["model_id"] == "E5"
    assert data["velocity_mps"] >= 0.0
    assert data["calibrated_sigma_mps"] >= 0.05


def test_api_benchmark(client):
    """POST /api/v1/ml/benchmark returns multi-model comparisons."""
    r = client.post("/api/v1/ml/benchmark")
    assert r.status_code == 200
    data = r.json()
    assert data["models_evaluated"] == 11
    assert len(data["results"]) == 11


# =====================================================================
# 7. NAVIGATION INTEGRATION TESTS
# =====================================================================

def test_navigation_engine_uses_selected_model():
    """Verify live NavigationSessionEngine receives and applies model inferences."""
    engine = NavigationSessionEngine("test-session-all-models")
    assert engine.ml_manager.is_ready() is True

    # Seed with 50 IMU samples at 10Hz
    t0 = 1000.0
    for i in range(55):
        t = t0 + i * 0.1
        pkt = {
            "type": "imu",
            "timestamp": t,
            "accel_x": 0.5,
            "accel_y": 0.0,
            "accel_z": 9.80665,
            "gyro_x": 0.0,
            "gyro_y": 0.0,
            "gyro_z": 0.01,
            "seq_num": i
        }
        engine.process_sensor_packet(pkt)

    # Verify AI forward velocity and uncertainty are populated in nav state
    assert engine.nav_state.ai_velocity is not None
    assert engine.nav_state.ai_uncertainty_sigma is not None
    assert engine.nav_state.ai_selected_model == "E5"
    assert engine.nav_state.ai_model_status == "PRODUCTION / VALIDATED"
    assert engine.nav_state.ai_total_inferences > 0

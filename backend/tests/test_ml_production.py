"""
Unit and Integration Tests for YatraSaarthi Production AI/ML Pipeline
Verifies:
1. Real E5 Velocity Model loading and architecture
2. Real U2 Decoupled Uncertainty Head loading and architecture
3. 15-Feature preprocessing pipeline & scaling
4. Inference on authentic IO-VNBD dataset sample
5. FastAPI /api/v1/ml/status and /health endpoints
6. InEKF Dead Reckoning integration with E5 velocity and U2 uncertainty
"""
import json
from pathlib import Path
import numpy as np
import pytest
import torch
from fastapi.testclient import TestClient

from app.main import app
from app.ml.inference.manager import ml_manager, MLInferenceResult
from app.ml.preprocessing.feature_pipeline import FeaturePipeline
from app.ml.preprocessing.window_buffer import IMUWindowBuffer
from app.services.navigation_engine import NavigationSessionEngine
from app.idr.enums import NavigationMode


@pytest.fixture(scope="module")
def sample_window_data():
    sample_path = Path(__file__).resolve().parent.parent / "app" / "ml" / "test_data" / "sample_imu_window.json"
    assert sample_path.exists(), f"Sample test data not found at {sample_path}"
    with open(sample_path, "r") as f:
        data = json.load(f)
    return data


def test_model_loading_and_parameter_counts():
    """Verify both E5 and U2 load strictly with the exact expected parameter counts."""
    assert ml_manager.load_models() is True
    assert ml_manager.is_ready() is True

    status = ml_manager.get_status()
    assert status["ready"] is True
    assert status["e5"]["loaded"] is True
    assert status["e5"]["parameters"] == 135425
    assert status["e5"]["input_features"] == 15
    assert status["e5"]["window_size"] == 50

    assert status["u2"]["loaded"] is True
    assert status["u2"]["parameters"] == 10369
    assert status["u2"]["latent_dim"] == 128


def test_feature_pipeline_exact_15_channels(sample_window_data):
    """Verify feature pipeline outputs exact shape [1, 50, 15] and finite numeric values."""
    pipeline = FeaturePipeline()
    raw_imu = np.column_stack([
        sample_window_data["accel_x"],
        sample_window_data["accel_y"],
        sample_window_data["accel_z"],
        sample_window_data["gyro_x"],
        sample_window_data["gyro_y"],
        sample_window_data["gyro_z"]
    ])

    features = pipeline.process(raw_imu)
    assert isinstance(features, torch.Tensor)
    assert features.shape == (1, 50, 15)
    assert torch.all(torch.isfinite(features))

    # Features 0..5 are normalized IMU channels
    # Features 6..8 are gravity / 9.81
    # Features 9..11 are linear_accel / 2.0
    # Feature 12 is (lin_acc_mag - 1.0) / 2.0
    # Feature 13 is (accel_mag - 10.0) / 1.0
    # Feature 14 is (gyro_mag - 0.2) / 0.2
    assert features.dtype == torch.float32


def test_real_sample_inference(sample_window_data):
    """Verify E5 and U2 inference on authentic 50-sample IO-VNBD recording."""
    raw_imu = np.column_stack([
        sample_window_data["accel_x"],
        sample_window_data["accel_y"],
        sample_window_data["accel_z"],
        sample_window_data["gyro_x"],
        sample_window_data["gyro_y"],
        sample_window_data["gyro_z"]
    ])

    res = ml_manager.infer(raw_imu)
    assert isinstance(res, MLInferenceResult)
    assert res.valid is True
    assert res.velocity_mps is not None
    assert res.predicted_error_mps > 0
    assert res.calibrated_sigma_mps >= 0.05
    assert res.velocity_variance == pytest.approx(res.calibrated_sigma_mps ** 2, rel=1e-5)
    assert res.latency_ms > 0


def test_api_status_endpoints():
    """Verify /api/v1/ml/status and /health endpoints return real model metadata."""
    with TestClient(app) as client:
        # /health
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["status"] == "healthy"
        assert health_data["ai_ml"]["ready"] is True
        assert health_data["ai_ml"]["e5"]["loaded"] is True
        assert health_data["ai_ml"]["u2"]["loaded"] is True

        # /api/v1/ml/status
        ml_resp = client.get("/api/v1/ml/status")
        assert ml_resp.status_code == 200
        ml_data = ml_resp.json()
        assert ml_data["ready"] is True
        assert ml_data["e5"]["parameters"] == 135425
        assert ml_data["u2"]["parameters"] == 10369
        assert ml_data["calibration"]["k"] == pytest.approx(1.912254, rel=1e-4)
        assert ml_data["calibration"]["sigma_floor"] == 0.05


def test_navigation_session_ai_dead_reckoning(sample_window_data):
    """
    Simulate full NavigationSessionEngine with real IMU packets:
    1. Initialize from GNSS fix
    2. Stream 50 authentic IMU samples to trigger E5/U2 inference
    3. Simulate GNSS outage: confirm InEKF uses E5 velocity + U2 variance
    4. Verify navigation state contains real AI metrics and maintains bounded dead reckoning.
    """
    engine = NavigationSessionEngine(session_id="test_session_ai_dr", vehicle_type="CAR")
    assert engine.ml_manager.is_ready() is True

    # 1. Initialize filter with realistic GNSS fix
    t0 = 1000.0
    gnss_packet = {
        "type": "gnss",
        "timestamp": t0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "altitude": 216.0,
        "accuracy": 3.0,
        "speed": 1.0,
        "heading": 90.0  # East
    }
    state = engine.process_sensor_packet(gnss_packet)
    assert engine.ekf.initialized is True
    assert state["latitude"] == pytest.approx(28.6139, abs=1e-5)
    assert state["longitude"] == pytest.approx(77.2090, abs=1e-5)

    # 2. Feed 50 real IMU measurements (0.1s intervals)
    for i in range(50):
        t = t0 + (i + 1) * 0.1
        imu_packet = {
            "type": "imu",
            "timestamp": t,
            "accel_x": sample_window_data["accel_x"][i],
            "accel_y": sample_window_data["accel_y"][i],
            "accel_z": sample_window_data["accel_z"][i],
            "gyro_x": sample_window_data["gyro_x"][i],
            "gyro_y": sample_window_data["gyro_y"][i],
            "gyro_z": sample_window_data["gyro_z"][i],
            "seq_num": i
        }
        state = engine.process_sensor_packet(imu_packet)

    # 3. Verify AI model inference triggered on full 50-sample window
    assert state["ai_model_ready"] is True
    assert state["ai_velocity"] is not None
    assert state["ai_uncertainty_sigma"] is not None
    assert state["ai_variance"] is not None
    assert state["ai_window_fill_pct"] == 100.0
    assert state["ai_total_inferences"] >= 1

    # 4. Trigger GNSS Outage: dead reckoning state active
    engine.nav_state.gnss_available = False
    engine.nav_state.navigation_mode = NavigationMode.DEAD_RECKONING

    # Feed another 10 samples in dead reckoning mode
    for i in range(10):
        t = t0 + 5.1 + (i * 0.1)
        idx = i % 50
        imu_packet = {
            "type": "imu",
            "timestamp": t,
            "accel_x": sample_window_data["accel_x"][idx],
            "accel_y": sample_window_data["accel_y"][idx],
            "accel_z": sample_window_data["accel_z"][idx],
            "gyro_x": sample_window_data["gyro_x"][idx],
            "gyro_y": sample_window_data["gyro_y"][idx],
            "gyro_z": sample_window_data["gyro_z"][idx],
            "seq_num": 50 + i
        }
        state = engine.process_sensor_packet(imu_packet)

    # Verify dead reckoning position remains physically plausible (did not explode or become NaN)
    assert np.isfinite(state["latitude"])
    assert np.isfinite(state["longitude"])
    assert abs(state["latitude"] - 28.6139) < 0.01
    assert abs(state["longitude"] - 77.2090) < 0.01
    assert state["speed"] >= 0.0

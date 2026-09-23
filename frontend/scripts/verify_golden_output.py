"""
Golden-Output Verification Script: PyTorch vs ONNX for E5 & U2
Generates a deterministic golden test fixture and measures numerical parity.
"""
import os
import sys
import json
from pathlib import Path
import numpy as np

# Fix Windows console UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import onnxruntime as ort
from app.ml.models.e5_velocity import VelocityGravityModel
from app.ml.models.u2_uncertainty import DecoupledUncertaintyHead
from app.ml.preprocessing.feature_pipeline import FeaturePipeline

def verify_golden_output():
    print("==================================================")
    print("RUNNING GOLDEN-OUTPUT VERIFICATION: PYTORCH VS ONNX")
    print("==================================================")

    weights_dir = WORKSPACE_ROOT / "backend" / "app" / "ml" / "weights"
    models_dir = WORKSPACE_ROOT / "frontend" / "public" / "models"
    fixtures_dir = WORKSPACE_ROOT / "frontend" / "src" / "tests" / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    # 1. Deterministic Synthetic IMU Window (50 samples x 6 channels)
    np.random.seed(42)
    # Simulate realistic driving IMU: forward accel with gravity, mild vibrations, gentle turn
    t = np.linspace(0, 5.0, 50, dtype=np.float32)
    raw_imu_50x6 = np.zeros((50, 6), dtype=np.float32)
    raw_imu_50x6[:, 0] = 0.45 * np.sin(t) + 0.1 * np.random.randn(50)  # accel_x (lateral)
    raw_imu_50x6[:, 1] = 1.20 * np.cos(0.5 * t) + 0.15 * np.random.randn(50)  # accel_y (forward)
    raw_imu_50x6[:, 2] = 9.81 + 0.08 * np.random.randn(50)  # accel_z (vertical)
    raw_imu_50x6[:, 3] = 0.02 * np.sin(2 * t)  # gyro_x (roll rate)
    raw_imu_50x6[:, 4] = 0.01 * np.cos(2 * t)  # gyro_y (pitch rate)
    raw_imu_50x6[:, 5] = 0.05 * np.sin(0.8 * t)  # gyro_z (yaw rate)

    # 2. Extract 15 features using Python reference FeaturePipeline
    stats_path = weights_dir / "normalization_stats.json"
    pipeline = FeaturePipeline(stats_path=stats_path)
    features_15_torch = pipeline.process(raw_imu_50x6) # [1, 50, 15]
    features_15_np = features_15_torch.numpy()

    # 3. PyTorch E5 Inference
    e5_pth = weights_dir / "e5_best_model.pth"
    e5_model = VelocityGravityModel(input_features=15)
    e5_model.load_state_dict(torch.load(str(e5_pth), map_location="cpu"))
    e5_model.eval()

    with torch.no_grad():
        pytorch_e5_vel, pytorch_e5_latent = e5_model(features_15_torch, return_features=True)
        pytorch_e5_vel_val = float(pytorch_e5_vel.item())
        pytorch_e5_latent_np = pytorch_e5_latent.numpy()

    # 4. ONNX Runtime E5 Inference
    e5_onnx = models_dir / "e5_best_model.onnx"
    session_e5 = ort.InferenceSession(str(e5_onnx), providers=["CPUExecutionProvider"])
    onnx_e5_outputs = session_e5.run(
        ["velocity_mps", "latent_features_128"],
        {"imu_window_15": features_15_np}
    )
    onnx_e5_vel_val = float(onnx_e5_outputs[0].item())
    onnx_e5_latent_np = onnx_e5_outputs[1]

    # Compare E5
    e5_vel_abs_err = abs(pytorch_e5_vel_val - onnx_e5_vel_val)
    e5_latent_max_abs_err = float(np.max(np.abs(pytorch_e5_latent_np - onnx_e5_latent_np)))
    print(f"\n[E5 Numerical Parity]")
    print(f"  PyTorch Velocity : {pytorch_e5_vel_val:.6f} m/s")
    print(f"  ONNX Velocity    : {onnx_e5_vel_val:.6f} m/s")
    print(f"  Velocity Abs Err : {e5_vel_abs_err:.2e} (Tolerance: < 1e-4)")
    print(f"  Latent Max Err   : {e5_latent_max_abs_err:.2e} (Tolerance: < 1e-4)")

    assert e5_vel_abs_err < 1e-4, f"E5 Velocity error {e5_vel_abs_err} exceeds tolerance!"
    assert e5_latent_max_abs_err < 1e-4, f"E5 Latent error {e5_latent_max_abs_err} exceeds tolerance!"
    print("  [PASS] E5 PyTorch vs ONNX is numerically identical within tolerance!")

    # 5. PyTorch U2 Inference
    u2_pth = weights_dir / "u2_best_model.pth"
    u2_model = DecoupledUncertaintyHead(latent_dim=128)
    u2_model.load_state_dict(torch.load(str(u2_pth), map_location="cpu"))
    u2_model.eval()

    with torch.no_grad():
        pytorch_u2_err = u2_model(pytorch_e5_latent)
        pytorch_u2_err_val = float(pytorch_u2_err.item())

    # 6. ONNX Runtime U2 Inference
    u2_onnx = models_dir / "u2_best_model.onnx"
    session_u2 = ort.InferenceSession(str(u2_onnx), providers=["CPUExecutionProvider"])
    onnx_u2_outputs = session_u2.run(
        ["predicted_error_mps"],
        {"latent_features_128": onnx_e5_latent_np}
    )
    onnx_u2_err_val = float(onnx_u2_outputs[0].item())

    u2_abs_err = abs(pytorch_u2_err_val - onnx_u2_err_val)
    print(f"\n[U2 Numerical Parity]")
    print(f"  PyTorch Error Est: {pytorch_u2_err_val:.6f} m/s")
    print(f"  ONNX Error Est   : {onnx_u2_err_val:.6f} m/s")
    print(f"  Abs Error        : {u2_abs_err:.2e} (Tolerance: < 1e-4)")

    assert u2_abs_err < 1e-4, f"U2 Error {u2_abs_err} exceeds tolerance!"
    print("  [PASS] U2 PyTorch vs ONNX is numerically identical within tolerance!")

    # 7. Save Golden Fixture for Browser / Frontend Unit Tests
    golden_payload = {
        "fixture_description": "Golden 50-sample IMU window and reference outputs from PyTorch/ONNX",
        "raw_imu_50x6": raw_imu_50x6.tolist(),
        "features_15": features_15_np[0].tolist(),
        "expected_pytorch": {
            "velocity_mps": pytorch_e5_vel_val,
            "predicted_error_mps": pytorch_u2_err_val,
            "latent_sample_first_5": pytorch_e5_latent_np[0, :5].tolist(),
        },
        "expected_onnx": {
            "velocity_mps": onnx_e5_vel_val,
            "predicted_error_mps": onnx_u2_err_val,
            "latent_sample_first_5": onnx_e5_latent_np[0, :5].tolist(),
        },
        "verification_metrics": {
            "e5_velocity_abs_error": e5_vel_abs_err,
            "e5_latent_max_abs_error": e5_latent_max_abs_err,
            "u2_error_abs_error": u2_abs_err,
            "passed": True
        }
    }

    golden_json_path = fixtures_dir / "golden_e5_u2_fixture.json"
    with open(golden_json_path, "w") as f:
        json.dump(golden_payload, f, indent=2)

    print(f"\n[OK] Golden fixture saved to: {golden_json_path}")
    print("==================================================")
    print("ALL GOLDEN-OUTPUT PARITY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    verify_golden_output()

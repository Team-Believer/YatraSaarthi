import sys
import os
import json
import math
import numpy as np
import torch

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend to path (READ ONLY)
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.ml.models.e5_velocity import VelocityGravityModel
from app.ml.models.u2_uncertainty import DecoupledUncertaintyHead
from app.ml.preprocessing.feature_pipeline import FeaturePipeline

def generate_replay():
    weights_dir = os.path.join(BACKEND_DIR, "app", "ml", "weights")
    stats_path = os.path.join(weights_dir, "normalization_stats.json")
    e5_path = os.path.join(weights_dir, "e5_best_model.pth")
    u2_path = os.path.join(weights_dir, "u2_best_model.pth")

    pipeline = FeaturePipeline(stats_path=stats_path)

    e5_model = VelocityGravityModel(input_features=15)
    ckpt_e5 = torch.load(e5_path, map_location="cpu")
    e5_model.load_state_dict(ckpt_e5["model_state_dict"] if "model_state_dict" in ckpt_e5 else ckpt_e5)
    e5_model.eval()

    u2_model = DecoupledUncertaintyHead(latent_dim=128)
    ckpt_u2 = torch.load(u2_path, map_location="cpu")
    u2_model.load_state_dict(ckpt_u2["model_state_dict"] if "model_state_dict" in ckpt_u2 else ckpt_u2)
    u2_model.eval()

    # Load 50-sample base window
    sample_file = os.path.join(BACKEND_DIR, "app", "ml", "test_data", "sample_imu_window.json")
    with open(sample_file, "r") as f:
        sample_data = json.load(f)

    # We will generate a 120-step replay sequence (12 seconds at 10 Hz)
    N_STEPS = 100
    base_acc_x = sample_data["accel_x"]
    base_acc_y = sample_data["accel_y"]
    base_acc_z = sample_data["accel_z"]
    base_gyr_x = sample_data["gyro_x"]
    base_gyr_y = sample_data["gyro_y"]
    base_gyr_z = sample_data["gyro_z"]

    # Synthesize continuous 150-sample stream (50 initial buffer + 100 replay steps)
    full_imu_stream = []
    t_start = 1000.0
    dt = 0.1 # 10 Hz

    for i in range(50 + N_STEPS):
        t = t_start + i * dt
        idx = i % 50
        # Add realistic vehicle dynamics (speed variation, turns)
        phase = i / 10.0
        ax = base_acc_x[idx] + 0.3 * math.sin(phase * 0.5)
        ay = base_acc_y[idx] + 0.1 * math.cos(phase * 0.3)
        az = base_acc_z[idx]
        gx = base_gyr_x[idx] + 0.005 * math.sin(phase)
        gy = base_gyr_y[idx] + 0.003 * math.cos(phase)
        gz = base_gyr_z[idx] + 0.02 * math.sin(phase * 0.4)

        full_imu_stream.append({
            "timestamp": round(t, 2),
            "accel_x": float(ax),
            "accel_y": float(ay),
            "accel_z": float(az),
            "gyro_x": float(gx),
            "gyro_y": float(gy),
            "gyro_z": float(gz)
        })

    # Decile calibrator params
    calib_k = 1.9122540606990217
    calib_floor = 0.05

    # Run Python Pipeline step by step
    replay_records = []
    
    # State variables for Python reference DR
    ref_lat = 23.0225000
    ref_lon = 72.5714000
    ref_alt = 55.0
    ref_vn = 0.0
    ref_ve = 0.0
    ref_vd = 0.0
    ref_heading = 90.0 # East initial

    for step in range(N_STEPS):
        window_samples = full_imu_stream[step : step + 50]
        cur_sample = full_imu_stream[step + 49]

        # Extract features
        w_mat = np.zeros((50, 6), dtype=np.float32)
        for j, s in enumerate(window_samples):
            w_mat[j, 0] = s["accel_x"]
            w_mat[j, 1] = s["accel_y"]
            w_mat[j, 2] = s["accel_z"]
            w_mat[j, 3] = s["gyro_x"]
            w_mat[j, 4] = s["gyro_y"]
            w_mat[j, 5] = s["gyro_z"]

        feat15_tensor = pipeline.process(w_mat) # [1, 50, 15]

        # Run E5
        with torch.no_grad():
            v_pred_tensor, latent = e5_model(feat15_tensor, return_features=True)
            v_pred = float(v_pred_tensor.squeeze().item())

            # Run U2
            u_err_tensor = u2_model(latent)
            u_err = float(u_err_tensor.squeeze().item())

        # Decile calibrate
        sigma = max(calib_k * u_err, calib_floor)
        variance = sigma ** 2

        # Strapdown / DR update
        # Heading integration
        gz_val = cur_sample["gyro_z"]
        ref_heading = (ref_heading + math.degrees(gz_val * dt)) % 360.0

        # AI velocity fused with heading
        h_rad = math.radians(ref_heading)
        target_vn = v_pred * math.cos(h_rad)
        target_ve = v_pred * math.sin(h_rad)

        # Simple filter velocity blending
        ref_vn = 0.8 * ref_vn + 0.2 * target_vn
        ref_ve = 0.8 * ref_ve + 0.2 * target_ve

        # Coordinate integration
        dlat = (ref_vn * dt) / 111319.5
        cos_lat = math.cos(math.radians(ref_lat))
        dlon = (ref_ve * dt) / (111319.5 * cos_lat)

        ref_lat += dlat
        ref_lon += dlon

        replay_records.append({
            "step": step,
            "timestamp": cur_sample["timestamp"],
            "imu_sample": cur_sample,
            "expected_python": {
                "velocity_mps": v_pred,
                "predicted_error_mps": u_err,
                "calibrated_sigma": sigma,
                "calibrated_variance": variance,
                "heading_deg": ref_heading,
                "velocity_ned": [ref_vn, ref_ve, ref_vd],
                "latitude": ref_lat,
                "longitude": ref_lon
            }
        })

    output_path = os.path.join(os.path.dirname(__file__), "..", "src", "tests", "fixtures", "replay_validation_fixture.json")
    with open(output_path, "w") as f:
        json.dump({
            "description": "Continuous 100-step 10Hz replay sensor trajectory with Python reference outputs",
            "step_count": N_STEPS,
            "dt_seconds": dt,
            "initial_position": {
                "latitude": 23.0225,
                "longitude": 72.5714,
                "altitude": 55.0,
                "heading_deg": 90.0
            },
            "initial_50_buffer": full_imu_stream[:50],
            "replay_steps": replay_records
        }, f, indent=2)

    print(f"Generated replay fixture at {output_path} with {N_STEPS} steps.")

if __name__ == "__main__":
    generate_replay()

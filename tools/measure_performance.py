"""
Precise Execution Latency Profiler for YatraSaarthi MVP
Measures micro-latencies of each navigation pipeline subsystem on CPU.
"""
import time
import numpy as np
import torch
from app.ml.inference.manager import ml_manager
from app.ml.preprocessing.window_buffer import IMUWindowBuffer
from app.idr.inekf import InvariantEKF
from app.idr.state import IMUMeasurement, GNSSMeasurement
from app.services.navigation_engine import NavigationSessionEngine


def run_benchmark():
    ml_manager.load_models()
    
    # 1. IMU Window Buffer Resampling Latency (1000 iterations)
    buf = IMUWindowBuffer(window_size=50, target_freq_hz=10.0)
    base_t = time.time()
    for i in range(60):
        buf.add_sample(base_t + i*0.05, 0.05, 0.0, 9.81, 0.0, 0.0, 0.0)
    
    t0 = time.perf_counter()
    for _ in range(1000):
        _ = buf.get_resampled_window()
    t_buf_ms = (time.perf_counter() - t0)  # Total ms for 1000 runs -> avg in ms
    
    # 2. E5 Inference Latency (100 iterations)
    sample_window = buf.get_resampled_window()
    t0 = time.perf_counter()
    for _ in range(100):
        _ = ml_manager.infer(sample_window, "E5")
    t_e5_ms = (time.perf_counter() - t0) * 10.0  # avg ms
    
    # 3. InEKF Predict + Update Latency (1000 iterations)
    ekf = InvariantEKF()
    ekf.initialize_from_gnss(GNSSMeasurement(timestamp=100.0, latitude=28.61, longitude=77.20, accuracy=3.0))
    imu_meas = IMUMeasurement(timestamp=100.01, accel_x=0.01, accel_y=0.01, accel_z=9.81)
    
    t0 = time.perf_counter()
    for _ in range(1000):
        ekf.predict(imu_meas)
        ekf.update_nhc(0.01, 0.05)
    t_ekf_ms = (time.perf_counter() - t0)
    
    # 4. End-to-end Session Engine Packet Processing (1000 packets)
    engine = NavigationSessionEngine("perf_test")
    imu_packet = {"type": "imu", "timestamp": 100.0, "accel_x": 0.0, "accel_y": 0.0, "accel_z": 9.81, "gyro_x": 0.0, "gyro_y": 0.0, "gyro_z": 0.0}
    
    t0 = time.perf_counter()
    for _ in range(1000):
        _ = engine.process_sensor_packet(imu_packet)
    t_engine_ms = (time.perf_counter() - t0)
    
    print("=== SUBSYSTEM LATENCY PROFILE (Windows Host, Python 3.13, PyTorch CPU) ===")
    print(f"1. IMU 10Hz Window Resampling (50 samples): {t_buf_ms:.3f} ms / call")
    print(f"2. E5 AI Forward Velocity + U2 Uncertainty: {t_e5_ms:.3f} ms / inference")
    print(f"3. InEKF Predict + NHC Update:              {t_ekf_ms:.3f} ms / step")
    print(f"4. End-to-End Packet Processing Loop:       {t_engine_ms:.3f} ms / packet")
    print(f"Budget: 100.0 ms (for 10 Hz streaming). Engine operates {100.0 / max(t_engine_ms, 0.001):.1f}x faster than real-time.")


if __name__ == "__main__":
    run_benchmark()

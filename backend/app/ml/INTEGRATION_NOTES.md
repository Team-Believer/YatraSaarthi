# YatraSaarthi AI/ML Complete Integration Report & Model Inventory

**Status**: Verified & Integrated  
**Target System**: YatraSaarthi Real-Time Navigation Engine (FastAPI + React + Mapbox)  
**All Models Integrated**: E0, E1, E2, E3, E4, E5, E6, E7, U0, U1, U2, Calibration (12 variants)

---

## 1. Complete Model Inventory & Status Designations

All 12 model variants from the offline research repository have been audited, classified, and migrated into the primary runtime system.

| Model ID | Identifier / Description | Architecture Class | Input Specification | Weights Checkpoint | Parameters | Status Designation | Primary RMSE | Unseen RMSE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E0** | Baseline (No Aug, No Mag) | `VelocityBaselineModel` | 6-channel normalized IMU | `weights/e0_best_model.pt` | 150,849 | `REFERENCE / BASELINE` | 4.25 m/s | 8.19 m/s |
| **E1** | Rotation Robustness (Aug Only) | `AdaptiveVelocityBaselineModel` | 6-channel with 3D aug | `weights/e1_best_model.pth` | 133,697 | `EXPERIMENTAL / FAILED / DEGRADED` | 5.12 m/s | 9.21 m/s |
| **E2** | Rotation-Invariant Magnitudes | `AdaptiveVelocityBaselineModel` | 8-channel (IMU + mags) | `weights/e2_best_model.pth` | 134,081 | `EXPERIMENTAL / FAILED / DEGRADED` | 5.41 m/s | 9.15 m/s |
| **E3** | Capacity / Residual Block | `VelocityRobustModel` | 8-channel with ResidualBlock | `weights/e3_best_model.pth` | 159,041 | `EXPERIMENTAL / FAILED / DEGRADED` | 4.78 m/s | 8.95 m/s |
| **E4** | Speed Robustness (Sampler) | `AdaptiveVelocityBaselineModel` | 6-channel speed-balanced | `weights/e4_best_model.pth` | 133,697 | `DIAGNOSTIC / ROBUSTNESS` | 4.45 m/s | 7.00 m/s |
| **E5** | Physics-Aware Velocity | `VelocityGravityModel` | 15-channel physics features | `weights/e5_best_model.pth` | 135,425 | `PRODUCTION / VALIDATED` | **3.95 m/s** | **7.09 m/s** |
| **E6** | Phone→Vehicle Alignment | `CausalGravityAligner` | 6-ch $\to$ 12 aligned features | `models/e6_alignment.py` | Geometric EMA Filter | `EXPERIMENTAL / FAILED / DEGRADED` | N/A | N/A |
| **E7** | Combined (E4 Sampler + E5) | `CombinedVelocityModel` | 15-channel physics features | `weights/e7_best_model.pth` | 135,425 | `EXPERIMENTAL / ABLATION` | 4.48 m/s | 7.38 m/s |
| **U0** | Formal Deterministic Baseline | `U0DeterministicModel` | 15-channel physics features | `weights/u0_best_model.pth` | 135,425 | `REFERENCE / BASELINE` | 3.95 m/s | 7.09 m/s |
| **U1** | Heteroscedastic Mean + Variance | `VelocityUncertaintyModel` | 15-channel, Gaussian NLL | `weights/u1_best_model.pth` | 135,490 | `EXPERIMENTAL / FAILED / DEGRADED` | 5.78 m/s | 8.76 m/s |
| **U2** | Decoupled Uncertainty Head | `DecoupledUncertaintyHead` | 128-d latent features | `weights/u2_best_model.pth` | 10,369 | `PRODUCTION / VALIDATED` | Spearman: 0.358 | Cal Error: 0.054 |
| **Calibration** | Decile Scalar Variance Calibrator | Scalar Decile Formula | Predicted error $\to$ std/var | `weights/calibration.json` | 2 parameters ($k, \sigma_0$) | `PRODUCTION / VALIDATED` | Cal Error: 0.054 | 95% nominal |

---

## 2. Preprocessing Adapters

The `ModelInputAdapter` (`app/ml/preprocessing/adapters.py`) accepts raw 6-channel continuous IMU samples `[50, 6]` from smartphone devices and converts them into the exact required input format:

1. **6-Channel Adapter (E0, E1, E4)**: Normalizes raw acceleration and angular velocity using the training set means and standard deviations from `normalization_stats.json`.
2. **8-Channel Adapter (E2, E3)**: Appends Euclidean acceleration magnitude and angular velocity magnitude to the 6 normalized IMU channels.
3. **12-Channel Adapter (E6)**: Runs online causal Exponential Moving Average (EMA) gravity estimation and Rodrigues rotation to rotate device coordinates to the gravity vector (`[0, 0, 1]`), extracting aligned linear acceleration, horizontal acceleration, and gyro.
4. **15-Channel Adapter (E5, E7, U0, U1)**: Computes gravity separation, linear acceleration ($a_{\text{lin}} / 2.0$), linear acceleration magnitude, accel magnitude, and gyro magnitude.
5. **Latent Adapter (U2)**: Extracts the 128-dimensional hidden state vector from the final timestep of the E5/U0 GRU layer.

---

## 3. Production Pipeline (E5 + U2 + Calibration)

The default validated navigation pipeline operates as follows:
```
Raw Smartphone IMU [50, 6]
         ↓
15-Channel Physics Preprocessing
         ↓
E5 Velocity Model (CNN-GRU) ────→ Predicted Speed [m/s]
         ↓ Latent Features [1, 128]
U2 Decoupled Head (MLP-Softplus) ──→ Predicted Error [m/s]
         ↓
Decile Scalar Calibration (k=1.91225, floor=0.05) ──→ 1-Sigma Uncertainty & Variance
         ↓
InEKF Navigation Filter & Outage Manager
```

---

## 4. Diagnostics, Model Selection & Benchmarking

- **Dynamic Model Selection**: `POST /api/v1/ml/select` allows activating any model (E0–E7, U0–U2) without restarting the server or breaking live navigation sessions.
- **Comparative Benchmarking**: `POST /api/v1/ml/benchmark` runs all models simultaneously on the same 5-second sensor window and returns side-by-side latency, predicted speed, and error estimates.
- **WebSocket Telemetry**: Fused navigation packets stream `ai_selected_model`, `ai_model_status`, `ai_velocity`, `ai_uncertainty_sigma`, `ai_variance`, and `ai_inference_latency_ms` to the frontend at real-time cadence.

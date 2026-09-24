# YatraSaarthi — AI Models, Neural Inference & Hybrid Dead Reckoning

This document details the machine learning architectures, ONNX model implementations, training paradigms, and edge/server inference pipelines used in YatraSaarthi.

---

## 1. Machine Learning Architecture Overview

YatraSaarthi solves the long-standing open-loop drift problem of inertial dead reckoning in consumer smartphones through a **Physics-Informed Hybrid Neural-InEKF Fusion Architecture**.

```
[Phone IMU (Accel + Gyro 50Hz)]
          │
          ▼
  [Rolling Window Buffer (100 samples / 2s)]
          │
          ├──▶ [E5: Temporal Dilated CNN Velocity Net] ──▶ Forward Velocity (m/s)
          │
          ├──▶ [U2: Heteroscedastic Uncertainty Net]   ──▶ Dynamic Measurement Variance σ²
          │
          └──▶ [G4: Contextual Outage Predictor]      ──▶ Tunnel / Canopy Environment State
                                                                │
                                                                ▼
                                              [InEKF Lie Group Fusion Engine]
                                                                │
                                                                ▼
                                                [Drift-Free Navigation State]
```

---

## 2. Model Specifications

### 2.1 E5 — Velocity Estimation Network (`model_e5.onnx`)
- **Input**: `(batch_size, 6, 100)` — 3-axis accelerometer and 3-axis gyroscope normalized window.
- **Architecture**: 1D Dilated Residual Temporal Convolutional Network (TCN) with multi-scale receptive field (dilations 1, 2, 4, 8, 16) and causal padding.
- **Output**: 1D scalar forward speed ($\hat{v} \ge 0\text{ m/s}$).
- **Inference Latency**: $\approx 1.8\text{ ms}$ on CPU; $< 0.8\text{ ms}$ via WebAssembly SIMD.

### 2.2 U2 — Heteroscedastic Uncertainty Network (`model_u2.onnx`)
- **Input**: `(batch_size, 6, 100)` + E5 velocity feature embedding.
- **Architecture**: Dual-head dense network predicting epistemic and aleatoric variance.
- **Output**: 1D scalar variance ($\sigma_v^2$) used directly to construct the InEKF measurement covariance matrix $R_{vel} = \text{diag}(\sigma_v^2, \sigma_{lat}^2, \sigma_{vert}^2)$.
- **Purpose**: When the vehicle hits potholes or irregular road conditions, U2 dynamically inflates $\sigma_v^2$, preventing bad IMU artifacts from corrupting filter state.

### 2.3 G4 — Outage & Tunnel Feature Network
- **Input**: Multi-modal sensor health features (satellite CNR, innovation norms, IMU variance).
- **Output**: Environmental classification (`OUTDOOR`, `URBAN_CANYON`, `TUNNEL`, `UNDERPASS`).

---

## 3. Edge ONNX WebAssembly Runtime (`frontend/src/services/offline/`)

- **Runtime**: ONNX Runtime Web (`onnxruntime-web`) with multi-threaded WASM SIMD execution.
- **Execution Context**: Background Web Worker (`offlineNavWorker.ts`) so UI remains at a smooth 60 FPS.
- **Offline Guarantee**: The models are cached locally in IndexedDB / CacheStorage via the Service Worker (`sw.js`).

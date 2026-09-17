# YatraSaarthi AI/ML Integration Notes & Specification Report

Generated: Phase 1 Repository Audit & Discovery  
Target System: YatraSaarthi Real-Time Navigation Engine (FastAPI + React)

---

## 1. Executive Summary & Model Identification

Following a full-repository audit of `Yatra-Sarthi-AI-ML-main/`, the production models for AI-assisted dead reckoning have been identified, verified against their exact parameter checkpoints, and mathematically validated.

| Component | Model Name / Identifier | Source Checkpoint Path | Architecture Class | Parameters |
| :--- | :--- | :--- | :--- | :--- |
| **Velocity Model (E5)** | `E5_frozen_reference` | `experiments/E5_frozen_reference/best_model.pth` | `VelocityGravityModel` | 135,425 trainable |
| **Uncertainty Model (U2)** | `U2_decoupled_uncertainty` | `experiments/U2_decoupled_uncertainty/best_model.pth` | `DecoupledUncertaintyHead` | 10,369 trainable |
| **Calibration** | Decile Scalar Calibration | `experiments/uncertainty_calibration/calibration_results.json` | Scalar $k$ with floor | $k=1.91225$, floor=$0.05$ |
| **Normalization** | Training Split Statistics | `data/processed/normalization_stats.json` | Per-axis mean & std | 6 sensor axes |

Both checkpoints loaded strictly with `<All keys matched successfully>`.

---

## 2. E5 Velocity Model Specification

### 2.1 Architecture
The E5 model is a physics-aware 1D CNN + GRU sequential network:
- **Input Layer**: `[B, 15, 50]` (transposed from `[B, 50, 15]`)
- **CNN Block 1**: `Conv1d(15, 64, kernel_size=3, padding=1)` $\rightarrow$ `BatchNorm1d(64)` $\rightarrow$ `GELU()`
- **CNN Block 2**: `Conv1d(64, 128, kernel_size=3, padding=1)` $\rightarrow$ `BatchNorm1d(128)` $\rightarrow$ `GELU()`
- **Temporal Recurrence**: `GRU(input_size=128, hidden_size=128, num_layers=1, batch_first=True)`
- **Feature Extraction**: Takes the final timestep output of the GRU: `features = out[:, -1, :]` $\rightarrow$ shape `[B, 128]`
- **Regression Head**:
  - `Linear(128, 64)` $\rightarrow$ `GELU()`
  - `Linear(64, 1)` $\rightarrow$ `squeeze(-1)` $\rightarrow$ shape `[B]`

### 2.2 Output
- **Value**: Scalar forward velocity $\hat{v}$.
- **Units**: Meters per second ($\text{m/s}$).
- **Feature Vector**: Latent representation tensor of shape `[B, 128]` passed directly to U2.

---

## 3. U2 Decoupled Uncertainty Model Specification

### 3.1 Architecture
The U2 head is a multi-layer perceptron with smooth non-linear activation predicting absolute residual velocity error:
- **Input**: Latent features `[B, 128]` from E5 GRU
- **MLP Layers**:
  - `Linear(128, 64)` $\rightarrow$ `GELU()`
  - `Linear(64, 32)` $\rightarrow$ `GELU()`
  - `Linear(32, 1)`
- **Output Activation**: `Softplus()` $+ 1\times 10^{-3}$ (guarantees strictly positive error prediction)

### 3.2 Output
- **Value**: Predicted absolute velocity error $\hat{\epsilon} = |\hat{v} - v_{\text{true}}|$.
- **Units**: Meters per second ($\text{m/s}$).

---

## 4. Uncertainty Calibration & Variance Mapping

### 4.1 Parameters
Extracted from `experiments/uncertainty_calibration/calibration_results.json`:
- Method: `scalar`
- Scaling factor ($k$): `1.9122540606990217`
- Variance floor ($\sigma_{\text{floor}}$): `0.05` $\text{m/s}$

### 4.2 Mathematical Mapping to Kalman Filter Noise
$$\sigma = \max(k \cdot \hat{\epsilon}, \sigma_{\text{floor}})$$
$$R_v = \sigma^2 \quad (\text{m}^2/\text{s}^2)$$

This calibrated variance $R_v$ is supplied directly as the measurement noise covariance to `InvariantEKF.update_velocity()`.

---

## 5. Input Data & Preprocessing Pipeline

### 5.1 Raw Input Channels
Receives 6 real smartphone IMU channels from browser `DeviceMotionEvent`:
1. `accel_x` ($\text{m/s}^2$)
2. `accel_y` ($\text{m/s}^2$)
3. `accel_z` ($\text{m/s}^2$)
4. `gyro_x` ($\text{rad/s}$)
5. `gyro_y` ($\text{rad/s}$)
6. `gyro_z` ($\text{rad/s}$)

### 5.2 Sampling Rate & Windowing
- **Sampling Frequency**: $10\,\text{Hz}$ ($dt = 0.1\,\text{s} = 100\,\text{ms}$).
- **Window Length**: $T = 50$ samples ($5.0\,\text{seconds}$).
- **Window Stride**: Sliding window, inference performed every 1 to 5 samples ($0.1\,\text{s}$ to $0.5\,\text{s}$).

### 5.3 15-Feature Engineering
The input tensor of shape `[1, 50, 15]` is constructed as follows:

1. **Standardized IMU (Features 0 to 5)**:
   $$x_{\text{norm}, i} = \frac{x_{\text{raw}, i} - \mu_i}{\sigma_i + 10^{-6}}$$
   Using statistics from `normalization_stats.json`:
   - `accel_x`: $\mu = 0.031600$, $\sigma = 1.856510$
   - `accel_y`: $\mu = -0.092167$, $\sigma = 1.782833$
   - `accel_z`: $\mu = 9.836938$, $\sigma = 0.834444$
   - `gyro_x`: $\mu = 0.000185$, $\sigma = 0.119974$
   - `gyro_y`: $\mu = -0.002462$, $\sigma = 0.258653$
   - `gyro_z`: $\mu = 0.000254$, $\sigma = 0.160434$

2. **Causal Gravity Estimation (Features 6 to 8)**:
   Exponential Moving Average (EMA) over the window with $\alpha = 0.02$:
   $$g_0 = a_0, \quad g_t = 0.02 \cdot a_t + 0.98 \cdot g_{t-1}$$
   Scaled: $\frac{g}{9.81}$

3. **Linear Acceleration (Features 9 to 11)**:
   $$a_{\text{lin}} = a - g$$
   Scaled: $\frac{a_{\text{lin}}}{2.0}$

4. **Linear Acceleration Magnitude (Feature 12)**:
   $$|a_{\text{lin}}| = \sqrt{a_{\text{lin}, x}^2 + a_{\text{lin}, y}^2 + a_{\text{lin}, z}^2}$$
   Normalized: $\frac{|a_{\text{lin}}| - 1.0}{2.0}$

5. **Total Acceleration Magnitude (Feature 13)**:
   $$|a| = \sqrt{a_x^2 + a_y^2 + a_z^2}$$
   Normalized: $\frac{|a| - 10.0}{1.0}$

6. **Total Gyroscope Magnitude (Feature 14)**:
   $$|\omega| = \sqrt{\omega_x^2 + \omega_y^2 + \omega_z^2}$$
   Normalized: $\frac{|\omega| - 0.2}{0.2}$

Total features: $6 + 3 + 3 + 1 + 1 + 1 = 15$ channels.

---

## 6. Integration Architecture with InEKF / Navigation

```
                       REAL GNSS
                           │
                           ▼
REAL IMU (10Hz) ──► Window Buffer (50 samples)
                           │
                           ▼
                  Feature Pipeline (15 features)
                           │
                           ▼
                      E5 Model
                     /        \
                    /          \
                   ▼            ▼
             Velocity (v)    Latent Features (128)
                   │            │
                   │            ▼
                   │         U2 Model
                   │            │
                   │            ▼
                   │     Uncertainty (ε)
                   │            │
                   │            ▼
                   │     Calibration (σ, Rv)
                   │            │
                   ▼            ▼
               InEKF Velocity Update (v_meas, R_vel)
                           │
                           ▼
               Invariant Extended Kalman Filter
               (State: δp, δv, δθ, δba, δbg)
                           │
                           ├──► NHC (Non-Holonomic Constraints)
                           ├──► ZUPT (Stationary Detection)
                           ├──► Map Matching
                           │
                           ▼
                    Fused Navigation State
                           │
                           ▼
                    WebSocket Broadcast
                           │
                           ▼
                    React UI / Mapbox
```

When GNSS is available:
- GNSS provides absolute position and course updates to InEKF.
- E5/U2 velocity estimates provide high-frequency forward velocity updates ($v_x$).

When GNSS is lost:
- InEKF transitions to Dead Reckoning (`DEAD_RECKONING_ACTIVE` / `DR_AI_AIDED`).
- E5 predicts forward speed; U2 provides variance bound $R_v$.
- InEKF integrates forward velocity aligned with vehicle attitude (heading $\psi$, pitch $\theta$), combined with NHC ($v_y \approx 0, v_z \approx 0$) and ZUPT when stopped.
- Drift is bounded by U2 calibrated uncertainty.

---

## 7. Runtime Dependencies & Environment

- **PyTorch**: Required for CPU inference (`torch >= 2.0.0`).
- **No GPU Required**: Forward pass takes $< 3\,\text{ms}$ on CPU.
- **Dependencies Removed/Excluded**: No need for `torchvision`, `torchaudio`, `matplotlib`, `pyarrow` at runtime.
- **Model Pathing**: Dynamic resolution relative to backend application root via `settings.py` / `ML_MODEL_DIR`.

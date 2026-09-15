# YatraSaarthi - System Architecture

This document details the architectural design, mathematical filter models, data flows, and database schema for **YatraSaarthi**.

---

## 1. End-to-End System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER / HARDWARE                      │
│                                                                   │
│  [navigator.geolocation]    [DeviceMotionEvent]  [DeviceOrientation]
│         (GNSS Fixes)           (Accel + Gyro)       (Mag Compass) │
│               │                      │                    │       │
│               └──────────────────────┼────────────────────┘       │
│                                      ▼                            │
│                  [Frontend SensorCollectorSubsystem]              │
│                  - sensorCapabilities.ts (Feature Check)           │
│                  - sensorPermissions.ts (Permission Handler)      │
│                  - sensorClock.ts (Monotonic Time Sync)           │
│                  - sensorNormalizer.ts (JSON Serialization)       │
└──────────────────────────────────┬────────────────────────────────┘
                                   │ Real Telemetry Stream (~10-50 Hz)
                                   ▼ WebSocket: /ws/navigation/{session_id}
┌───────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND SYSTEM                       │
│                                                                   │
│                 [WebSocket Connection Manager]                    │
│                                  │                                │
│                                  ▼                                │
│                     [InEKF IDR Engine Core]                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 1. Strapdown INS Mechanization (Quaternion Kinematics)     │  │
│  │ 2. Invariant EKF Propagation & Joseph Covariance Update     │  │
│  │ 3. Adaptive Non-Holonomic Constraints (Car/Truck vs Lean)   │  │
│  │ 4. Multi-Source Heading Engine (Gyro + GPS Course + Mag)    │  │
│  │ 5. Outage Manager FSM (GNSS_AIDED -> DEAD_RECKONING)        │  │
│  │ 6. Shapely / NetworkX Map Matcher                           │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
│                                 │                                 │
│              Broadcast NavigationState (~10 Hz)                   │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
┌──────────────────┐                            ┌───────────────────┐
│ Client UI Store  │                            │ SQLite Database   │
│ (useNavStore.ts) │                            │ (yatrasaarthi.db) │
└──────────────────┘                            └───────────────────┘
```

---

## 2. Invariant Extended Kalman Filter (InEKF) Core

The IDR Engine implements an **Invariant Error-State Kalman Filter** operating on Lie Group representations:

$$\mathcal{X} \in SO(3) \times \mathbb{R}^3 \times \mathbb{R}^3$$

### 2.1 State Vector Definition
State vector $\mathbf{x}_k$ contains 15 dimensions:
- Position in metric NED frame $\mathbf{p} = [p_n, p_e, p_d]^T$
- Velocity in metric NED frame $\mathbf{v} = [v_n, v_e, v_d]^T$
- Attitude rotation matrix $C_b^n \in SO(3)$ (derived from quaternion $\mathbf{q}$)
- Accelerometer bias $\mathbf{b}_a = [b_{ax}, b_{ay}, b_{az}]^T$
- Gyroscope bias $\mathbf{b}_g = [b_{gx}, b_{gy}, b_{gz}]^T$

### 2.2 Propagation Phase (INS Strapdown Mechanization)
Given specific force $\mathbf{f}_b$ and rotation rate $\boldsymbol{\omega}_b$:

$$\mathbf{p}_{k+1} = \mathbf{p}_k + \mathbf{v}_k \Delta t + \frac{1}{2} \left( C_b^n (\mathbf{f}_b - \mathbf{b}_a) + \mathbf{g}^n \right) \Delta t^2$$

$$\mathbf{v}_{k+1} = \mathbf{v}_k + \left( C_b^n (\mathbf{f}_b - \mathbf{b}_a) + \mathbf{g}^n \right) \Delta t$$

$$\mathbf{q}_{k+1} = \mathbf{q}_k \otimes \Delta \mathbf{q}(\boldsymbol{\omega}_b - \mathbf{b}_g)$$

### 2.3 Non-Holonomic Constraint (NHC) Measurement Update
For a 4-wheel vehicle moving without lateral slip:

$$v_y^b = 0, \quad v_z^b = 0$$

For 2-wheelers (Motorcycles/Scooters), roll angle $\phi$ and roll rate $\dot{\phi}$ dynamically inflate the lateral constraint noise covariance $R_{nhc}$ to allow lean angles during turns.

---

## 3. Database Schema Overview (`backend/app/models/models.py`)

| Table Name | Primary Key | Key Attributes & Foreign Keys |
| :--- | :--- | :--- |
| `users` | `id` (int) | `email`, `hashed_password`, `full_name`, `created_at` |
| `navigation_sessions` | `id` (string UUID) | `user_id`, `start_time`, `end_time`, `distance_meters`, `duration_seconds`, `vehicle_type`, `is_active` |
| `navigation_points` | `id` (int) | `session_id`, `timestamp`, `latitude`, `longitude`, `speed`, `heading`, `position_confidence`, `navigation_mode` |
| `sensor_samples` | `id` (int) | `session_id`, `timestamp`, `seq_num`, `accel_x/y/z`, `gyro_x/y/z`, `mag_alpha/beta/gamma` |
| `sensor_health` | `id` (int) | `session_id`, `timestamp`, `sensor_name`, `status`, `update_rate`, `missing_samples` |
| `user_settings` | `id` (int) | `user_id`, `distance_unit`, `speed_unit`, `vehicle_type`, `auto_tunnel_mode`, `sensor_fusion_enabled` |

---

## 4. Hardware Failure & Degradation Handling

```
GNSS Quality Nominal (HDOP < 2.5) ──────► NavigationMode: GNSS_AIDED (Full InEKF Update)
                                                │
                                                ▼ (GNSS updates cease or HDOP > 5.0)
NavigationMode: GNSS_DEGRADING ────────► NavigationMode: DEAD_RECKONING
                                                │ (InEKF Strapdown + NHC + ZUPT)
                                                ▼ (GNSS returns with gating check)
NavigationMode: BLENDED_RECOVERY ──────► NavigationMode: GNSS_AIDED (Smooth Reset)
```

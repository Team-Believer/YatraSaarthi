# YatraSaarthi - System Overview

> **Tagline**: "Beyond GPS. Always With You."  
> **Product Category**: AI/ML-based Intelligent Dead Reckoning (IDR) Navigation Platform for GNSS-Denied & Degraded Environments.

---

## 1. Product Vision & Purpose

**YatraSaarthi** is a research and production-quality navigation platform designed to provide uninterrupted positioning when satellite navigation systems (GNSS / GPS / NavIC) fail or degrade. Typical failure scenarios include:
- **Tunnels & Subways**
- **Urban Canyons** (tall high-rise buildings blocking line-of-sight satellites)
- **Parking Garages & Underground Structures**
- **Dense Forest Foliage & Mountain Valleys**

Instead of falling back to frozen location markers or synthetic interpolation, YatraSaarthi fuses high-frequency **6-DoF Inertial Measurement Unit (IMU)** readings (accelerometer, gyroscope) and magnetic orientation with an **Invariant Extended Kalman Filter (InEKF)** to maintain real-time dead-reckoning trajectory tracking.

---

## 2. Non-Negotiable System Directives

1. **Zero Data Fabrication**: Absolutely NO synthetic data generators, demo modes, pretend WebSockets, or fake IMU noise. If physical hardware motion sensors are unavailable on the client browser (e.g., standard desktop PCs), the platform explicitly displays **"Unavailable on this device/browser"** and operates in degraded GNSS-only or standby mode.
2. **Single Live Integrated Architecture**: The frontend browser handles raw DOM sensor capture (`navigator.geolocation`, `DeviceMotionEvent`, `DeviceOrientationEvent`) and normalizes it; the backend FastAPI server processes the physical streams in real-time over WebSockets at ~10–50 Hz.
3. **Persisted State & Telemetry**: Every navigation session, trajectory point, sensor health event, and dead-reckoning state estimate is saved to SQLite (`data/yatrasaarthi.db`) via SQLAlchemy.

---

## 3. Core System Functional Modules

| Module Name | Scope & Responsibilities | Key Technologies |
| :--- | :--- | :--- |
| **Frontend Telemetry Subsystem** | Hardware feature detection, native permissions, time sync, normalization, and WebSocket streaming. | React 18, TypeScript, Zustand, DOM Sensor APIs |
| **InEKF IDR Engine** | Strapdown INS mechanization, Lie-algebra error state propagation, Joseph-form covariance updates, $\chi^2$ innovation gating. | Python 3.10+, NumPy, SciPy |
| **Adaptive Constraints (NHC)** | Dynamic zero-lateral/zero-vertical velocity constraints for 4-wheel vehicles and roll-leaning relaxation for two-wheelers. | Kinematic Physics Equations |
| **Outage & Reacquisition Engine** | Finite State Machine (`GNSS_AIDED` $\rightarrow$ `GNSS_LOST` $\rightarrow$ `DEAD_RECKONING` $\rightarrow$ `REACQUISITION`). | Python FSM State Machine |
| **Map Matching** | Road graph network projection and confidence scoring. | Shapely, NetworkX |
| **REST & WebSocket API** | JWT auth, session management, telemetry endpoints, settings, real-time WebSocket connection manager. | FastAPI, Pydantic v2, PyJWT |
| **Database & Persistence** | Relational storage of user accounts, sessions, high-resolution points, and sensor health events. | SQLite 3, SQLAlchemy 2.0 |

---

## 4. Operational Environment

- **Development Port (Frontend)**: `http://localhost:5173`
- **Development Port (Backend REST & WS)**: `http://localhost:8000` / `ws://localhost:8000`
- **Database Path**: `backend/data/yatrasaarthi.db`

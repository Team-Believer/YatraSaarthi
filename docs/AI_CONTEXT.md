# YatraSaarthi - AI Assistant Context & Codebase Invariants

> **Purpose**: This file provides immediate structural, architectural, and verification context for AI coding assistants working on the YatraSaarthi codebase.

---

## 1. Project Invariants & Directives

1. **NO FAKE OR SIMULATED DATA**:
   - Do NOT create mock data generators, pretend WebSockets, fake GPS tracks, hardcoded moving coordinates, or artificial AI accuracy numbers.
   - If physical client sensors (IMU / Orientation) are absent, render explicit status: **"Unavailable on this device/browser"**.
2. **SINGLE LIVE INTEGRATED SYSTEM**:
   - The platform operates as ONE integrated live system.
   - Browser client extracts real DOM sensor events (`navigator.geolocation`, `DeviceMotionEvent`, `DeviceOrientationEvent`) $\rightarrow$ Normalizes payload $\rightarrow$ Streams over WebSocket to FastAPI backend $\rightarrow$ Backend runs InEKF IDR Engine $\rightarrow$ Broadcasts fused navigation state back to client UI $\rightarrow$ Persists to SQLite (`data/yatrasaarthi.db`).
3. **TECH STACK**:
   - **Frontend**: React 18, TypeScript, Vite, React Router v6, Mapbox GL JS, Tailwind CSS, Zustand.
   - **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, WebSockets, NumPy, SciPy, Shapely, NetworkX.
   - **Database**: SQLite (`data/yatrasaarthi.db`).

---

## 2. Core Architecture Cheat Sheet

### 2.1 Backend Modules (`backend/app/`)
- `idr/inekf.py`: Lie-group Invariant EKF error state propagation & update ($SO(3) \times \mathbb{R}^3 \times \mathbb{R}^3$).
- `idr/mechanization.py`: Strapdown INS integration and WGS-84 geodesic conversions.
- `idr/nhc.py`: Adaptive Non-Holonomic Constraints (zero-lateral/zero-vertical velocity).
- `idr/heading.py`: Multi-source heading fusion engine.
- `idr/outage_manager.py`: Outage Finite State Machine (`GNSS_AIDED` $\rightarrow$ `DEAD_RECKONING`).
- `websocket/manager.py`: Handles high-frequency WebSocket connection, validates incoming JSON packets, and feeds the InEKF IDR engine.
- `models/models.py`: Declarative SQLAlchemy models (`User`, `NavigationSession`, `NavigationPoint`, `SensorSample`, `SensorHealth`, `UserSetting`).

### 2.2 Frontend Modules (`frontend/src/`)
- `services/sensors/sensorCollector.ts`: Coordinates `geolocation.ts`, `motion.ts`, `orientation.ts`, `sensorNormalizer.ts`, and `sensorPermissions.ts`.
- `hooks/useNavigationWebSocket.ts`: Bi-directional WebSocket hook.
- `stores/useNavigationStore.ts`: Primary fused navigation state store.
- `stores/useSensorStore.ts`: Hardware capabilities and permission states.
- `pages/`: `Dashboard.tsx`, `LiveMap.tsx`, `TunnelMode.tsx`, `SensorDiagnostics.tsx`, `History.tsx`, `LearningInsights.tsx`, `SettingsPage.tsx`, `LoginPage.tsx`.

---

## 3. Verification Commands

Before concluding any work, run the following verification checks:

1. **Frontend Build & Typecheck**:
   ```bash
   cd frontend
   npm run build
   ```
   (Must output code 0 with zero TypeScript errors).

2. **Backend Automated Test Suite**:
   ```bash
   cd backend
   pytest -v
   ```

---

## 4. Key Data Contract Snippet

### Incoming Client WebSocket Packet Schema
```json
{
  "type": "combined",
  "timestamp": 1789450000.123,
  "seq_num": 1,
  "gnss": { "latitude": 23.0225, "longitude": 72.5714, "speed": 12.5, "heading": 88.0, "accuracy": 3.2 },
  "imu": { "accel": [0.12, -0.05, 9.81], "gyro": [0.001, -0.002, 0.015] },
  "orientation": { "alpha": 88.5, "beta": 2.1, "gamma": -0.8 }
}
```

### Outgoing Server WebSocket State Broadcast Schema
```json
{
  "type": "navigation_state",
  "latitude": 23.02251,
  "longitude": 72.57142,
  "speed": 12.48,
  "heading_deg": 88.2,
  "horizontal_accuracy": 2.45,
  "position_confidence": 0.94,
  "navigation_mode": "GNSS_AIDED",
  "alignment_status": "FINE_ALIGNED",
  "nhc_active": true,
  "gnss_available": true
}
```

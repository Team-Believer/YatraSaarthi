# YatraSaarthi - Developer Onboarding & Architecture Guide

Welcome to the **YatraSaarthi** codebase! This guide is written for software engineers, GIS developers, and AI/ML researchers to easily understand the entire codebase layout, build architecture, live sensor constraints, and workflow patterns.

---

## 1. Project Overview & Zero-Mock Guarantee

**YatraSaarthi** ("Beyond GPS. Always With You.") is an Intelligent Dead Reckoning (IDR) platform for GNSS-denied and degraded environments (such as tunnels, parking garages, and urban canyons).

> [!IMPORTANT]
> **Core Engineering Constraint**: This application operates strictly on **REAL device sensor data**. There are no synthetic trip generators, hardcoded coordinate loops, or mock WebSockets. If hardware sensors are unavailable on a desktop browser, the application honestly reports **"Unavailable on this device/browser"**.

---

## 2. Directory Layout & Key File Locations

```
YatraSaarthi/
├── backend/                        # Python FastAPI Backend Engine
│   ├── app/
│   │   ├── api/v1/                 # REST Routers (auth, navigation, sensors, history, settings)
│   │   ├── core/                   # Passlib security & Pydantic config
│   │   ├── db/                     # SQLAlchemy session & declarative Base
│   │   ├── idr/                    # InEKF filter, INS strapdown, NHC, heading, map matching
│   │   │   ├── inekf.py            # Invariant EKF Lie-group state propagation & update
│   │   │   ├── mechanization.py    # Strapdown INS integration & geodesy equations
│   │   │   ├── nhc.py              # Adaptive Non-Holonomic Constraints (Car/Truck vs Lean)
│   │   │   ├── heading.py          # Multi-source heading fusion engine
│   │   │   ├── outage_manager.py   # GNSS Outage Finite State Machine
│   │   │   └── map_matching.py     # Shapely & NetworkX road graph map matching
│   │   ├── models/models.py        # Database tables (users, sessions, points, health)
│   │   ├── schemas/schemas.py      # Pydantic validation models
│   │   ├── websocket/manager.py    # Real-time WebSocket ConnectionManager & IDR stream engine
│   │   └── main.py                 # FastAPI application root & router registration
│   ├── data/yatrasaarthi.db        # SQLite persistence file
│   └── tests/                      # Pytest suite
├── frontend/                       # React 18 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI elements (Topbar, Sidebar, GlobalStatusBadge)
│   │   ├── hooks/                  # Custom hooks (useNavigationWebSocket.ts)
│   │   ├── pages/                  # React Router page components
│   │   │   ├── Dashboard.tsx       # Live session starter & active metrics
│   │   │   ├── LiveMap.tsx         # Mapbox vehicle trajectory map
│   │   │   ├── TunnelMode.tsx      # Outage & dead reckoning monitor
│   │   │   ├── SensorDiagnostics.ts# Telemetry graphs & hardware frequency checks
│   │   │   ├── History.tsx         # Recorded journey listings from SQLite
│   │   │   ├── LearningInsights.ts # Telemetry statistics & navigation mode breakdown
│   │   │   ├── SettingsPage.tsx    # Vehicle kinematic profile & system toggles
│   │   │   └── LoginPage.tsx       # JWT user sign in & registration
│   │   ├── services/sensors/       # Client sensor extraction pipeline
│   │   │   ├── sensorCollector.ts  # Master stream collector
│   │   │   ├── geolocation.ts      # W3C Geolocation API listener
│   │   │   ├── motion.ts           # DeviceMotionEvent listener (accel + gyro)
│   │   │   └── orientation.ts      # DeviceOrientationEvent listener (compass)
│   │   └── stores/                 # Zustand store state management
│   │       ├── useNavigationStore.ts# Core fused navigation state
│   │       └── useSensorStore.ts   # Hardware capabilities & permission states
│   └── package.json
├── docs/                           # System, Architecture & API Documentation
└── README.md
```

---

## 3. High-Level Data & Control Flow

1. **Client Acquisition**: In `frontend/src/services/sensors/sensorCollector.ts`, client sensor listeners stream raw DOM measurements.
2. **WebSocket Push**: When a navigation session starts, `useNavigationWebSocket.ts` connects to `ws://localhost:8000/ws/navigation/{session_id}` and streams `combined` JSON packets (~10-50 Hz).
3. **Backend Processing**: `backend/app/websocket/manager.py` receives the telemetry packet, feeds it into `backend/app/idr/inekf.py`, executes strapdown INS kinematics, applies Non-Holonomic Constraints, updates the covariance matrix, and broadcasts a `navigation_state` JSON message.
4. **Reactive UI Update**: `useNavigationStore` updates its reactive Zustand state, triggering instantaneous re-renders on Mapbox GL JS (`LiveMap.tsx`), telemetry gauges (`Dashboard.tsx`), and outage alerts (`TunnelMode.tsx`).
5. **Persistence**: Active points and session details are written directly to SQLite (`data/yatrasaarthi.db`).

---

## 4. How to Develop & Test

### 4.1 Running Backend Server
```bash
cd backend
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
python -m uvicorn app.main:app --port 8000 --reload
```

### 4.2 Running Backend Test Suite
```bash
cd backend
pytest -v
```

### 4.3 Running Frontend Dev Server
```bash
cd frontend
npm run dev -- --host
```

### 4.4 Running Frontend Production Build & Typecheck
```bash
cd frontend
npm run build
```

> **Testing on Smartphone Hardware**: Open `http://<YOUR_COMPUTER_LOCAL_IP>:5173` on a smartphone connected to the same Wi-Fi network to test physical 6-DoF accelerometer, gyroscope, and compass acquisition.

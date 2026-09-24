# YatraSaarthi

> **"Beyond GPS. Always With You."**

YatraSaarthi is a production-quality, live-sensor Intelligent Dead Reckoning (IDR) navigation platform engineered for GNSS-denied and degraded environments (such as tunnels, urban canyons, parking structures, and mountain passes).

Unlike typical GPS applications or synthetic visual simulators, YatraSaarthi operates as **ONE integrated LIVE system**. It streams real 6-DoF inertial measurements (accelerometer, gyroscope) and magnetic orientation from client device hardware via high-frequency WebSockets to an Invariant Extended Kalman Filter (InEKF) engine on the backend.

---

## Technical Highlights & Absolute Engineering Guarantee

* **Zero Data Fabrication**: No demo modes, mock navigation routes, hardcoded coordinates, or artificial noise generation. If physical sensors (IMU / orientation) are missing on desktop browsers, the UI explicitly displays **"Unavailable on this device/browser"** and operates in degraded GNSS-only or standby state.
* **Invariant EKF (InEKF) Core**: Lie-group error-state Kalman filter ($SO(3) \times \mathbb{R}^3 \times \mathbb{R}^3$) implementing strapdown INS integration, dynamic accelerometer/gyroscope bias estimation, and Joseph-form covariance updates with $\chi^2$ innovation gating.
* **Adaptive Non-Holonomic Constraints (NHC)**: Enforces zero-lateral and zero-vertical velocity constraints for rigid 4-wheel vehicles (Cars/Trucks) while automatically detecting roll-angle leaning on two-wheelers (Motorcycles/Scooters) to dynamically adjust constraint covariance.
* **Outage State Machine**: State transitions (`GNSS_AIDED` $\rightarrow$ `GNSS_DEGRADING` $\rightarrow$ `GNSS_LOST` $\rightarrow$ `DEAD_RECKONING` $\rightarrow$ `REACQUISITION` $\rightarrow$ `BLENDED_RECOVERY`) with continuous covariance propagation and zero-velocity update (ZUPT) detection.
* **Confidence-Aware Map Matching**: Shapely and NetworkX road graph candidate projection with topological HMM transition probabilities.
* **Full-Stack Persistence**: SQLite database (`data/yatrasaarthi.db`) with SQLAlchemy models and Alembic migrations tracking navigation sessions, sensor health, telemetry samples, and error bounds.

---

## Architecture & System Flow

```
┌─────────────────────────────────────────────────────────┐
│                 Client Device / Browser                 │
│  - Geolocation (navigator.geolocation.watchPosition)    │
│  - DeviceMotion (DeviceMotionEvent accel + gyro)        │
│  - DeviceOrientation (DeviceOrientationEvent compass)   │
└────────────────────────────┬────────────────────────────┘
                             │ Normalized JSON Telemetry
                             ▼ WebSocket (/ws/navigation/{session_id})
┌─────────────────────────────────────────────────────────┐
│                 FastAPI Backend Engine                  │
│  - WebSocket Connection Manager & Packet Validator      │
│  - InEKF Filter Propagation & Covariance Tracking       │
│  - Adaptive NHC & Multi-Source Heading Engine           │
│  - Outage State Machine & Road Map Matcher              │
└────────────────────────────┬────────────────────────────┘
                             │ ~10 Hz State Updates
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 SQLite Persistence & UI                 │
│  - yatrasaarthi.db (Sessions, Points, Sensor Health)     │
│  - Mapbox GL JS Live Position & Trajectory Overlay      │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

* **Frontend**: React 18, TypeScript, Vite, React Router v6, Mapbox GL JS, Tailwind CSS, Zustand, Lucide Icons
* **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, WebSockets, NumPy, SciPy, Shapely, NetworkX
* **Database**: SQLite (`yatrasaarthi.db`)

---

## Local Setup & Quickstart

### Prerequisites
* **Node.js**: v18 or higher
* **Python**: 3.10 or higher
* **Mapbox Token**: Access token from [Mapbox](https://account.mapbox.com) for vector map rendering.

### 1. Environment Configuration

**Frontend Environment (`frontend/.env` or root `.env`)**:
```env
MAPBOX_TOKEN="your_mapbox_access_token_here"
API_URL="https://yatrasaarthi.onrender.com"
```

**Backend Environment (`backend/.env`)**:
```env
MAPBOX_ACCESS_TOKEN="your_mapbox_access_token_here"
SQLITE_URL="sqlite:///./data/yatrasaarthi.db"
JWT_SECRET="your_jwt_secret_key_change_in_production"
```

### 2. Backend Setup & Run

Open a terminal and navigate to the project root:

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows)
.venv\Scripts\activate

# Activate virtual environment (macOS/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI development server
python -m uvicorn app.main:app --port 8000 --reload
```

The FastAPI server will start on `http://localhost:8000`. You can test the API docs at `http://localhost:8000/docs`.

### 3. Frontend Setup & Run

Open a separate terminal and navigate to the `frontend` directory:

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server with host listening for local mobile access
npm run dev -- --host
```

The web application will open at `http://localhost:5173`. 

> **Mobile Device Testing Tip**: To stream real 6-DoF accelerometer and gyroscope measurements from your smartphone, connect your phone to the same local Wi-Fi network and open `http://<YOUR_COMPUTER_LOCAL_IP>:5173` in your mobile browser.

---

## Automated Verification & Test Suite

### Running Backend Unit & Integration Tests

```bash
cd backend
pytest -v
```

Tests verify InEKF Lie-algebra propagation, Non-Holonomic Constraints adaptation, heading fusion, outage state transitions, JWT auth, and WebSocket packet ingestion.

### Running Frontend Build & Typechecks

```bash
cd frontend
npm run build
```

Performs strict TypeScript compilation (`tsc -b`) and Vite production bundling.

---

## Project Structure

```
YatraSaarthi/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Auth, navigation, sensors, routes, history, settings
│   │   ├── core/           # Security & config
│   │   ├── db/             # SQLAlchemy engine & session maker
│   │   ├── idr/            # InEKF, strapdown INS, NHC, heading, map matching
│   │   ├── ml/             # ML baseline interfaces & models
│   │   ├── models/         # Database domain models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── websocket/      # Connection manager & sensor stream handler
│   │   └── main.py         # FastAPI application entrypoint
│   ├── data/               # yatrasaarthi.db SQLite database location
│   ├── tests/              # Pytest test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Topbar, Sidebar, GlobalStatusBadge
│   │   ├── hooks/          # WebSocket hook
│   │   ├── pages/          # Dashboard, LiveMap, TunnelMode, Diagnostics, History, Insights, Settings, Login
│   │   ├── services/       # Live sensor collectors (Geolocation, Motion, Orientation)
│   │   ├── stores/         # Zustand state management
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## License

Research & Prototype Application — YatraSaarthi: "Beyond GPS. Always With You."


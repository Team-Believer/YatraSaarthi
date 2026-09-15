# YatraSaarthi - Backend Server & IDR Engine

> **Path**: `backend/`  
> **Tech Stack**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, WebSockets, NumPy, SciPy, Shapely, NetworkX, SQLite 3

---

## 1. Overview & Core IDR Architecture

The backend FastAPI application acts as the high-speed data ingest engine, state estimation core, and database persistence service for **YatraSaarthi**:

- **Real-Time WebSocket Server (`/ws/navigation/{session_id}`)**: Ingests normalized 10–50 Hz sensor packets from client browsers, validates packet integrity, feeds measurements to the IDR Engine, and broadcasts fused navigation state back to clients at ~10 Hz.
- **Invariant EKF (InEKF) Engine (`app/idr/inekf.py`)**: Lie-group error-state filter ($SO(3) \times \mathbb{R}^3 \times \mathbb{R}^3$) executing strapdown integration, accelerometer/gyroscope bias tracking, and Joseph-form covariance updates.
- **Adaptive Non-Holonomic Constraints (`app/idr/nhc.py`)**: Applies zero-lateral velocity constraints for rigid vehicles (Cars/Trucks) and adapts constraint covariance when two-wheelers (Motorcycles/Scooters) lean in turns.
- **Multi-Source Heading Engine (`app/idr/heading.py`)**: Fuses gyro integration, ground course velocity, magnetic heading, and map road bearing.
- **Map Matching (`app/idr/map_matching.py`)**: Shapely line projections and NetworkX road graph distance metrics.
- **Database & Repositories (`app/db/` & `app/models/`)**: SQLAlchemy engine storing persistent journey sessions, points, sensor health, and user preferences in `data/yatrasaarthi.db`.

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # User registration, login, JWT profile
│   │       ├── history.py       # Session listings, point trajectories, insights
│   │       ├── navigation.py    # Start/stop navigation sessions
│   │       ├── routes.py        # Directions & route calculations
│   │       ├── sensors.py       # Diagnostic check endpoint
│   │       └── settings.py      # User dynamic settings CRUD
│   ├── core/
│   │   ├── config.py        # Settings via Pydantic Settings
│   │   └── security.py      # Passlib bcrypt hashing & PyJWT token encoding
│   ├── db/
│   │   ├── base.py          # Declarative Base for models
│   │   └── session.py       # SQLAlchemy engine & SessionLocal factory
│   ├── idr/
│   │   ├── alignment.py     # Phone-to-vehicle frame rotation estimator
│   │   ├── anomalies.py     # IMU saturation & jitter anomaly detectors
│   │   ├── confidence.py    # Multi-metric confidence score computation
│   │   ├── enums.py         # NavigationMode, SensorStatus, VehicleType
│   │   ├── heading.py       # Multi-source heading fusion engine
│   │   ├── inekf.py         # Invariant Extended Kalman Filter implementation
│   │   ├── map_matching.py  # Shapely & NetworkX road map matcher
│   │   ├── mechanization.py # Strapdown INS kinematics & WGS-84 geodesy
│   │   ├── nhc.py           # Adaptive Non-Holonomic Constraints
│   │   ├── outage_manager.py# GNSS outage Finite State Machine
│   │   ├── state.py         # Mathematical state vector definitions
│   │   └── velocity.py      # Kinematic velocity & ZUPT detector
│   ├── ml/
│   │   ├── baseline.py      # Deterministic baseline physics model
│   │   ├── interfaces.py    # Abstract model interfaces
│   │   └── registry.py      # ModelRegistry service
│   ├── models/
│   │   └── models.py        # SQLAlchemy database domain models
│   ├── schemas/
│   │   └── schemas.py       # Pydantic validation & serialization schemas
│   ├── websocket/
│   │   └── manager.py       # WebSocket ConnectionManager & IDR stream engine
│   └── main.py              # FastAPI application setup & router registration
├── data/
│   └── yatrasaarthi.db      # SQLite database file
├── tests/                   # Pytest test suite
└── requirements.txt
```

---

## 3. Environment Variables (`backend/.env`)

```env
MAPBOX_ACCESS_TOKEN="your_mapbox_access_token"
SQLITE_URL="sqlite:///./data/yatrasaarthi.db"
JWT_SECRET="your_jwt_secret_key_change_in_production"
```

---

## 4. Local Setup & Execution

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

# Start FastAPI server
python -m uvicorn app.main:app --port 8000 --reload
```

---

## 5. Automated Tests

```bash
cd backend
pytest -v
```

The test suite validates InEKF Lie-algebra propagation, Non-Holonomic Constraints adaptation, heading fusion, outage state transitions, JWT authentication, and WebSocket handling.

# YatraSaarthi — Backend API & Services Architecture

This document details the FastAPI backend architecture, InEKF IDR navigation engine, database schemas, and REST/WebSocket endpoints.

---

## 1. Backend Architecture Stack

- **Framework**: FastAPI (Python 3.10+) with async endpoints.
- **Data Validation**: Pydantic v2 schemas.
- **ORM & DB**: SQLAlchemy 2.0 with SQLite (`data/yatrasaarthi.db`).
- **Kinematic & Filter Engine**: Invariant Extended Kalman Filter (InEKF) running in Lie group $SO(3) \times \mathbb{R}^3 \times \mathbb{R}^3$.
- **Geodesy**: WGS-84 geodesic radius computations and meridian curvature modeling.
- **Map Matching**: Topological candidate scoring using metric projection scaling and Shapely.

---

## 2. API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health and active filter status | No |
| `POST` | `/api/v1/auth/register` | Register new driver account | No |
| `POST` | `/api/v1/auth/login` | Login and obtain JWT bearer token | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Yes |
| `POST` | `/api/v1/navigation/session` | Create new navigation session | Yes / Optional |
| `POST` | `/api/v1/navigation/session/{id}/route` | Inject Mapbox route polyline | Yes / Optional |
| `POST` | `/api/v1/navigation/session/{id}/end` | Conclude navigation session | Yes / Optional |
| `WS` | `/ws/navigation/{id}` | Real-time bi-directional telemetry | No |
| `GET` | `/api/v1/history/sessions` | List recorded driver journeys | Yes / Optional |
| `GET` | `/api/v1/history/sessions/{id}/points`| Fetch journey GPS/DR points | Yes / Optional |
| `GET` | `/api/v1/settings` | Get user settings | Yes / Optional |
| `PUT` | `/api/v1/settings` | Update user settings | Yes / Optional |

---

## 3. IDR Core Modules (`backend/app/idr/`)

### 3.1 `inekf.py` — Invariant Extended Kalman Filter
- Error state vector: 15 dimensions ($3\times\text{Attitude Error}, 3\times\text{Velocity Error}, 3\times\text{Position Error}, 3\times\text{Accel Bias}, 3\times\text{Gyro Bias}$).
- Error state propagation with covariance Joseph-form update.
- Innovation gating with Mahalanobis distance ($\chi^2$ threshold: 11.345).
- Divergence recovery on GNSS reacquisition.

### 3.2 `mechanization.py` — Strapdown INS Kinematics
- Quaternion attitude integration using Rodrigues formula.
- Specific force transformation from body frame to NED frame.
- Gravity compensation and geodesic rate integration over WGS-84 ellipsoid.

### 3.3 `map_matching.py` — Metric Projection Road Matching
- Geographically scaled distance calculation:
  $$\Delta x = (\text{lon}_2 - \text{lon}_1) \times 111319.5 \times \cos(\text{lat})$$
  $$\Delta y = (\text{lat}_2 - \text{lat}_1) \times 111319.5$$
- Heading consistency penalty and corridor decay function.
- Route segment clearing on new route load.

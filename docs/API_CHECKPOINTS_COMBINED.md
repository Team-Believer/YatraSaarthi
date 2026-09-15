# YatraSaarthi - Combined API Checkpoints Reference (Frontend & Backend)

This document provides a single unified reference mapping every frontend view and service hook directly to its corresponding backend REST API endpoint, WebSocket message protocol, database model, and state store.

---

## 1. Unified Contract Matrix

```
┌─────────────────┬───────────────────────┬───────────────────────────────┬───────────────────────┬─────────────────────────────┐
│ Frontend View   │ State Store           │ Trigger / Hook                │ Backend Endpoint      │ SQLite Table                │
├─────────────────┼───────────────────────┼───────────────────────────────┼───────────────────────┼─────────────────────────────┤
│ Dashboard.tsx   │ useNavigationStore    │ POST start / stop session     │ /api/v1/navigation/*  │ navigation_sessions         │
│ LiveMap.tsx     │ useNavigationStore    │ WS Broadcast Listener         │ /ws/navigation/{id}   │ navigation_points           │
│ TunnelMode.tsx  │ useNavigationStore    │ Fused DR State Listener       │ /ws/navigation/{id}   │ dead_reckoning_states       │
│ Diagnostics.tsx │ useSensorStore        │ GET Diagnostics & WS Rates    │ /api/v1/sensors/*     │ sensor_health               │
│ History.tsx     │ Local Component State │ GET Session Summaries         │ /api/v1/history/*     │ navigation_sessions         │
│ Insights.tsx    │ Local Component State │ GET Analytics & Distribution  │ /api/v1/history/ins*  │ navigation_points           │
│ Settings.tsx    │ useSettingsStore      │ GET / PUT User Settings       │ /api/v1/settings/*    │ user_settings               │
│ LoginPage.tsx   │ useAuthStore          │ POST Register / Login JWT     │ /api/v1/auth/*        │ users                       │
└─────────────────┴───────────────────────┴───────────────────────────────┴───────────────────────┴─────────────────────────────┘
```

---

## 2. API & WebSocket Specifications

### 2.1 Authentication Subsystem (`/api/v1/auth`)
- **Register**: `POST /api/v1/auth/register` $\rightarrow$ Accepts `email`, `password`, `full_name`. Inserts row into `users`. Returns `access_token` and `user` object.
- **Login**: `POST /api/v1/auth/login` $\rightarrow$ Accepts `email`, `password`. Verifies bcrypt hash. Returns JWT `access_token`.
- **Profile**: `GET /api/v1/auth/me` $\rightarrow$ Requires Bearer Header. Returns authenticated user profile.

### 2.2 Navigation Session Management (`/api/v1/navigation`)
- **Start Session**: `POST /api/v1/navigation/start` $\rightarrow$ Accepts `vehicle_type`, `start_lat`, `start_lon`. Creates `navigation_sessions` row (`is_active=True`). Returns `session_id`.
- **Stop Session**: `POST /api/v1/navigation/stop/{session_id}` $\rightarrow$ Updates session `end_time`, `distance_meters`, `duration_seconds`, set `is_active=False`.

### 2.3 Real-Time WebSocket Telemetry (`/ws/navigation/{session_id}`)
- **Client $\rightarrow$ Server (Ingest Packet)**:
  - `type`: `"combined"` (or `"gnss"` / `"imu"` / `"orientation"`)
  - `seq_num`: Integer sequence number
  - `timestamp`: Monotonic Unix epoch seconds
  - `gnss`: `{ latitude, longitude, altitude, speed, heading, accuracy }`
  - `imu`: `{ accel: [x, y, z], gyro: [x, y, z] }`
  - `orientation`: `{ alpha, beta, gamma }`
- **Server $\rightarrow$ Client (State Broadcast ~10 Hz)**:
  - `type`: `"navigation_state"`
  - `latitude`, `longitude`, `altitude`, `speed`, `heading_deg`
  - `position_confidence`, `heading_confidence`
  - `navigation_mode` (`GNSS_AIDED` | `GNSS_DEGRADING` | `DEAD_RECKONING` | `BLENDED_RECOVERY`)
  - `alignment_status` (`COARSE_ALIGNED` | `FINE_ALIGNED`)
  - `nhc_active`, `zupt_active`, `map_matching_active`

### 2.4 History & Analytics (`/api/v1/history`)
- **List Sessions**: `GET /api/v1/history/sessions` $\rightarrow$ Returns array of completed sessions sorted by `start_time desc`.
- **Session Trajectory Detail**: `GET /api/v1/history/sessions/{session_id}` $\rightarrow$ Returns session details and full array of recorded `navigation_points`.
- **Telemetry Insights**: `GET /api/v1/history/insights` $\rightarrow$ Returns total journeys, distance, duration, telemetry points count, and `navigation_mode` distribution.

### 2.5 Settings Subsystem (`/api/v1/settings`)
- **Get Settings**: `GET /api/v1/settings/{user_id}` $\rightarrow$ Returns user preferences.
- **Update Settings**: `PUT /api/v1/settings/{user_id}` $\rightarrow$ Updates `distance_unit`, `speed_unit`, `vehicle_type`, `auto_tunnel_mode`, `sensor_fusion_enabled`.

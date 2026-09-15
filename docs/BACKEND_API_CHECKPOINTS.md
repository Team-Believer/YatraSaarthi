# YatraSaarthi - Backend API Checkpoints & Contract Reference

> **Base URL**: `http://localhost:8000`  
> **WebSocket URL**: `ws://localhost:8000`  
> **API Version**: `v1`  
> **Interactive Docs**: `http://localhost:8000/docs`

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### Checkpoint 1.1: Register New User
- **Method**: `POST`
- **Path**: `/api/v1/auth/register`
- **Request Body** (`UserRegister`):
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }
  ```
- **Response** (`200 OK` / `AuthTokenResponse`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe"
    }
  }
  ```
- **Error Codes**: `400 Bad Request` (Email already registered).

### Checkpoint 1.2: Login User
- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Request Body** (`UserLogin`):
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
- **Response** (`200 OK` / `AuthTokenResponse`): Same schema as 1.1.
- **Error Codes**: `401 Unauthorized` (Invalid email or password).

---

## 2. Navigation Session Endpoints (`/api/v1/navigation`)

### Checkpoint 2.1: Start Navigation Session
- **Method**: `POST`
- **Path**: `/api/v1/navigation/start`
- **Request Body** (`StartSessionRequest`):
  ```json
  {
    "vehicle_type": "CAR",
    "start_lat": 23.0225,
    "start_lon": 72.5714
  }
  ```
- **Response** (`200 OK` / `StartSessionResponse`):
  ```json
  {
    "session_id": "a3b1c2d4-5678-90ef-1234-56789abcdef0",
    "start_time": "2026-09-15T20:30:00.000Z",
    "status": "ACTIVE"
  }
  ```

### Checkpoint 2.2: Stop Navigation Session
- **Method**: `POST`
- **Path**: `/api/v1/navigation/stop/{session_id}`
- **Response** (`200 OK`):
  ```json
  {
    "session_id": "a3b1c2d4-5678-90ef-1234-56789abcdef0",
    "status": "STOPPED",
    "distance_meters": 3450.2,
    "duration_seconds": 420.5
  }
  ```

---

## 3. Real-Time Telemetry WebSocket (`/ws/navigation/{session_id}`)

### Checkpoint 3.1: Client Ingest Packet Types

**A. Combined Telemetry Packet**:
```json
{
  "type": "combined",
  "timestamp": 1789450000.123,
  "seq_num": 142,
  "gnss": {
    "latitude": 23.0225,
    "longitude": 72.5714,
    "altitude": 55.4,
    "speed": 12.5,
    "heading": 88.0,
    "accuracy": 3.2
  },
  "imu": {
    "accel": [0.12, -0.05, 9.81],
    "gyro": [0.001, -0.002, 0.015]
  },
  "orientation": {
    "alpha": 88.5,
    "beta": 2.1,
    "gamma": -0.8
  }
}
```

### Checkpoint 3.2: Server Navigation State Broadcast (~10 Hz)
```json
{
  "type": "navigation_state",
  "timestamp": 1789450000.200,
  "latitude": 23.02251,
  "longitude": 72.57142,
  "altitude": 55.4,
  "speed": 12.48,
  "heading_deg": 88.2,
  "horizontal_accuracy": 2.45,
  "position_confidence": 0.94,
  "heading_confidence": 0.96,
  "navigation_mode": "GNSS_AIDED",
  "environment_state": "NORMAL_ROAD",
  "alignment_status": "FINE_ALIGNED",
  "velocity_north": 0.38,
  "velocity_east": 12.47,
  "velocity_down": 0.0,
  "roll": 0.036,
  "pitch": 0.012,
  "yaw": 1.539,
  "nhc_active": true,
  "zupt_active": false,
  "map_matching_active": true,
  "gnss_available": true
}
```

---

## 4. Journey History & Insights Endpoints (`/api/v1/history`)

### Checkpoint 4.1: List Recorded Journeys
- **Method**: `GET`
- **Path**: `/api/v1/history/sessions?limit=50`
- **Response** (`200 OK` / `List[SessionSummary]`):
  ```json
  [
    {
      "session_id": "a3b1c2d4-5678-90ef-1234-56789abcdef0",
      "start_time": "2026-09-15T19:00:00",
      "end_time": "2026-09-15T19:15:00",
      "distance_meters": 4520.0,
      "duration_seconds": 900.0,
      "vehicle_type": "CAR"
    }
  ]
  ```

### Checkpoint 4.2: Get Telemetry Insights
- **Method**: `GET`
- **Path**: `/api/v1/history/insights`
- **Response** (`200 OK`):
  ```json
  {
    "total_sessions": 12,
    "total_distance_km": 48.5,
    "total_duration_minutes": 142.0,
    "points_processed": 14200,
    "mode_distribution": {
      "GNSS_AIDED": 11000,
      "DEAD_RECKONING": 3200
    },
    "has_data": true
  }
  ```

---

## 5. System Settings Endpoints (`/api/v1/settings`)

### Checkpoint 5.1: Get User Settings
- **Method**: `GET`
- **Path**: `/api/v1/settings/{user_id}`

### Checkpoint 5.2: Update User Settings
- **Method**: `PUT`
- **Path**: `/api/v1/settings/{user_id}`
- **Request Body** (`UserSettingsRequest`):
  ```json
  {
    "distance_unit": "km",
    "speed_unit": "km/h",
    "vehicle_type": "CAR",
    "auto_tunnel_mode": true,
    "sensor_fusion_enabled": true
  }
  ```

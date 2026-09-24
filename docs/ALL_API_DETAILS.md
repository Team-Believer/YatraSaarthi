# YatraSaarthi — Complete API & WebSocket Reference Specification

This document provides the exhaustive specification for all REST API endpoints, real-time WebSocket contracts, payload schemas, error formats, and client services in the YatraSaarthi platform.

---

## 1. Global API Standards

- **Base URL (Local)**: `http://localhost:8000` (Vite Proxy: `/api/v1`)
- **Base URL (Production)**: `https://yatrasaarthi.onrender.com`
- **WebSocket URL (Local)**: `ws://localhost:8000/ws/navigation/{session_id}`
- **WebSocket URL (Production)**: `wss://yatrasaarthi.onrender.com/ws/navigation/{session_id}`
- **Content-Type**: `application/json`
- **Authentication Scheme**: HTTP Bearer Token (`Authorization: Bearer <jwt_token>`)
- **Zero-Mock Policy**: All data returned and received represents real physics and verified database records.

---

## 2. Authentication API (`/api/v1/auth`)

### 2.1 Register User
- **Endpoint**: `POST /api/v1/auth/register`
- **Description**: Registers a new driver profile.
- **Request Body**:
  ```json
  {
    "email": "driver@yatrasaarthi.com",
    "password": "SecurePassword123!",
    "full_name": "Siddharth Sharma"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "id": "usr_94b1f810",
    "email": "driver@yatrasaarthi.com",
    "full_name": "Siddharth Sharma",
    "is_active": true,
    "created_at": "2026-09-24T10:00:00Z"
  }
  ```
- **Errors**: `400 Bad Request` (Email already registered, weak password).

### 2.2 Login User
- **Endpoint**: `POST /api/v1/auth/login`
- **Description**: Authenticates driver credentials and issues a JWT token.
- **Request Body** (`application/x-www-form-urlencoded` or JSON):
  ```json
  {
    "username": "driver@yatrasaarthi.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "usr_94b1f810",
      "email": "driver@yatrasaarthi.com",
      "full_name": "Siddharth Sharma"
    }
  }
  ```

### 2.3 Get Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (`200 OK`)**: User details.

---

## 3. Navigation Session API (`/api/v1/navigation`)

### 3.1 Start Navigation Session
- **Endpoint**: `POST /api/v1/navigation/session`
- **Description**: Creates a new navigation session on the backend server and initializes the InEKF IDR filter state.
- **Request Body**:
  ```json
  {
    "origin_lat": 23.022505,
    "origin_lon": 72.571362,
    "dest_lat": 23.033812,
    "dest_lon": 72.585021,
    "vehicle_type": "CAR",
    "destination_name": "Ahmedabad Central Station",
    "source_name": "Current Location",
    "travel_mode": "driving"
  }
  ```
- **Supported Vehicle Types**: `"CAR"`, `"MOTORCYCLE"`, `"SCOOTER"`.
- **Success Response (`200 OK`)**:
  ```json
  {
    "session_id": "sess_89ef410a-38d1",
    "status": "ACTIVE",
    "created_at": "2026-09-24T10:15:00Z",
    "vehicle_type": "CAR",
    "filter_initialized": true
  }
  ```

### 3.2 Inject Route Geometry
- **Endpoint**: `POST /api/v1/navigation/session/{session_id}/route`
- **Description**: Supplies the complete Mapbox directions polyline coordinates to enable topological map matching and heading snapping.
- **Request Body**:
  ```json
  {
    "coordinates": [
      [72.571362, 23.022505],
      [72.573510, 23.024800],
      [72.585021, 23.033812]
    ],
    "road_name": "NH48 Expressway Corridor"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ROUTE_LOADED",
    "segment_count": 2,
    "total_distance_meters": 1642.5
  }
  ```

### 3.3 End Navigation Session
- **Endpoint**: `POST /api/v1/navigation/session/{session_id}/end`
- **Description**: Concludes the session, stops sensor recording, computes journey statistics, and seals history record.
- **Success Response (`200 OK`)**:
  ```json
  {
    "session_id": "sess_89ef410a-38d1",
    "status": "COMPLETED",
    "duration_seconds": 842.3,
    "distance_km": 4.82,
    "avg_speed_kmh": 20.6,
    "max_speed_kmh": 48.2,
    "gnss_outage_count": 2,
    "total_dr_distance_km": 0.65
  }
  ```

---

## 4. Real-Time WebSocket Telemetry Protocol

- **Endpoint**: `/ws/navigation/{session_id}`

### 4.1 Client $\rightarrow$ Server: High-Frequency Sensor Stream (10–50 Hz)
```json
{
  "type": "combined",
  "timestamp": 1789450000.123,
  "seq_num": 104,
  "gnss": {
    "latitude": 23.022505,
    "longitude": 72.571362,
    "altitude": 55.4,
    "accuracy": 4.2,
    "speed": 11.8,
    "heading": 87.5
  },
  "imu": {
    "accel_x": 0.12,
    "accel_y": -0.05,
    "accel_z": 9.81,
    "gyro_x": 0.001,
    "gyro_y": -0.002,
    "gyro_z": 0.015
  },
  "orientation": {
    "alpha": 88.5,
    "beta": 2.1,
    "gamma": -0.8
  }
}
```

### 4.2 Server $\rightarrow$ Client: Fused Navigation State Broadcast
```json
{
  "type": "navigation_state",
  "timestamp": 1789450000.125,
  "latitude": 23.022508,
  "longitude": 72.571365,
  "altitude": 55.4,
  "speed": 11.78,
  "heading_deg": 87.8,
  "horizontal_accuracy": 3.1,
  "position_confidence": 92,
  "heading_confidence": 88,
  "map_confidence": 95,
  "navigation_mode": "GNSS_AIDED",
  "gnss_quality": "AVAILABLE",
  "environment_state": "OUTDOOR",
  "alignment_status": "FINE_ALIGNED",
  "gnss_available": true,
  "gnss_outage_duration": 0.0,
  "velocity_north": 0.45,
  "velocity_east": 11.77,
  "velocity_down": 0.02,
  "roll": 0.03,
  "pitch": 0.01,
  "yaw": 1.53
}
```

---

## 5. History API (`/api/v1/history`)

### 5.1 List Completed Sessions
- **Endpoint**: `GET /api/v1/history/sessions`
- **Query Params**: `limit` (default: 50), `offset` (default: 0)
- **Success Response (`200 OK`)**: Array of completed trip metadata.

### 5.2 Get Session Points / Trajectory
- **Endpoint**: `GET /api/v1/history/sessions/{session_id}/points`
- **Success Response (`200 OK`)**: Array of recorded navigation points with timestamp, mode, position, speed, and accuracy.

---

## 6. Settings API (`/api/v1/settings`)

### 6.1 Get User Settings
- **Endpoint**: `GET /api/v1/settings`
- **Success Response (`200 OK`)**: Current user settings (vehicle type, speed units, map style, dark mode).

### 6.2 Update User Settings
- **Endpoint**: `PUT /api/v1/settings`
- **Request Body**:
  ```json
  {
    "vehicle_type": "CAR",
    "speed_unit": "km/h",
    "map_style": "mapbox://styles/mapbox/navigation-night-v1"
  }
  ```
- **Success Response (`200 OK`)**: Updated settings object.

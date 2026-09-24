# YatraSaarthi — Frontend API & Architecture Specification

This document details the frontend architecture, state management stores, sensor services, and API integration layers for YatraSaarthi.

---

## 1. Environment & Network Configuration Layer

### 1.1 Custom Build-Time Injection (`services/api/envConfig.ts`)
The frontend uses a custom, secure configuration layer that dynamically detects build-time and runtime environment variables without prefix restrictions:
- `MAPBOX_TOKEN`: Mapbox public client access token.
- `API_URL`: Backend FastAPI HTTP endpoint (defaults to `https://yatrasaarthi.onrender.com` in production; relative in development).
- `WS_URL`: Backend WebSocket endpoint (derived automatically to `wss://` over HTTPS).

### 1.2 Public Accessor Functions
```typescript
import { getMapboxToken, getApiBaseUrl, getWsBaseUrl, getNavigationWsUrl } from './services/api/envConfig';

// Access Mapbox Token
const mapboxToken = getMapboxToken();

// Access Backend API Base
const apiBase = getApiBaseUrl();

// Access WebSocket Navigation URL for a Session
const wsUrl = getNavigationWsUrl(sessionId);
```

---

## 2. Core State Management (Zustand Stores)

### 2.1 Settings Store (`stores/useSettingsStore.ts`)
- **State**: `settings: UserSettings`
  - `vehicle_type`: `'CAR' | 'MOTORCYCLE' | 'SCOOTER'` (Single source of truth)
  - `speed_unit`: `'km/h' | 'mph'`
  - `map_style`: Mapbox vector style URI
  - `dark_mode`: boolean
  - `offline_mode`: boolean
- **Persistence**: Synced to `localStorage` under key `yatrasaarthi-settings`.

### 2.2 Navigation Store (`stores/useNavigationStore.ts`)
- **State**:
  - `sessionId`: Current active session ID or null.
  - `sessionStatus`: `'IDLE' | 'STARTING' | 'LIVE' | 'ERROR' | 'ENDED'`
  - `isLive`: boolean flag indicating active positioning.
  - `state`: Latest fused navigation state packet (`speed`, `latitude`, `longitude`, `heading_deg`, `horizontal_accuracy`, `position_confidence`, `navigation_mode`).
  - `activeRoute`: Currently selected RouteData.
  - `destination`: Target waypoint destination.
  - `source`: Starting waypoint (custom or GPS location).

### 2.3 Location Store (`stores/useLocationStore.ts`)
- **State**: Real raw device geolocation state (`latitude`, `longitude`, `accuracy`, `speed`, `heading`, `isTracking`).

---

## 3. Sensor Acquisition & Normalization Layer

### 3.1 `services/sensors/sensorCollector.ts`
Coordinates DOM sensor listeners and aggregates:
- `geolocation.ts`: W3C Geolocation API (`watchPosition`).
- `motion.ts`: `DeviceMotionEvent` (acceleration and gyroscope with gravity removal).
- `orientation.ts`: `DeviceOrientationEvent` (absolute magnetic compass heading).
- `sensorNormalizer.ts`: Filters, units normalization (m/s, rad/s, m/s²), and timestamp alignment.

---

## 4. Dual-Engine Failover Architecture

### 4.1 `services/navigation/navigationEngineCoordinator.ts`
Arbitrates between Server Engine (FastAPI InEKF over WebSocket) and Local Offline Web Worker Engine (`offlineNavWorker.ts`):
- When WebSocket is connected: Fused state from server is given 100% authority.
- When network drops or tunnel is entered: Offline Web Worker running local ONNX models and InEKF seamlessly takes over navigation tracking with zero lag.

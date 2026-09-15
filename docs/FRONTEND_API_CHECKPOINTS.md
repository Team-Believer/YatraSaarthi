# YatraSaarthi - Frontend API Checkpoints & State Bindings

This document maps all frontend components, Zustand stores, sensor services, and API integration hooks to their respective backend endpoints and data structures.

---

## 1. Frontend Sensor Extraction & Normalization Flow

```
[Browser DOM Events]
   ├── navigator.geolocation.watchPosition()  ──► GeolocationCollector (services/sensors/geolocation.ts)
   ├── DeviceMotionEvent (accel/gyro)          ──► MotionCollector (services/sensors/motion.ts)
   └── DeviceOrientationEvent (compass)        ──► OrientationCollector (services/sensors/orientation.ts)
                                                      │
                                                      ▼
                                       SensorNormalizer (sensorNormalizer.ts)
                                                      │
                                                      ▼
                                       SensorCollectorSubsystem (sensorCollector.ts)
                                                      │
                                                      ▼
                                       useNavigationWebSocket hook (hooks/useNavigationWebSocket.ts)
```

---

## 2. Component to API / WebSocket Mapping

| Frontend Component | Target Page / Area | Integrated Hook / API Call | Backend Checkpoint | Bound State |
| :--- | :--- | :--- | :--- | :--- |
| **`Dashboard.tsx`** | `/app` | `fetch('/api/v1/navigation/start')`<br>`fetch('/api/v1/navigation/stop/{id}')` | Checkpoint 2.1 & 2.2 | `useNavigationStore` (`state.session_id`, `state.speed`) |
| **`LiveMap.tsx`** | `/app/map` | `useNavigationWebSocket(sessionId)` | Checkpoint 3.2 (WS State Broadcast) | `useNavigationStore` (`latitude`, `longitude`, `heading_deg`, `navigation_mode`) |
| **`TunnelMode.tsx`** | `/app/tunnel` | Connected via `useNavigationStore` | Checkpoint 3.2 (WS State Broadcast) | `useNavigationStore` (`position_confidence`, `horizontal_accuracy`, `navigation_mode`) |
| **`SensorDiagnostics.tsx`**| `/app/diagnostics` | `fetch('/api/v1/sensors/diagnostics')` | Checkpoint 3.2 & 5.1 | `useSensorStore` (`capabilities`, `permissions`) |
| **`History.tsx`** | `/app/history` | `fetch('/api/v1/history/sessions')` | Checkpoint 4.1 | Local `sessions` state array |
| **`LearningInsights.tsx`** | `/app/learning` | `fetch('/api/v1/history/insights')` | Checkpoint 4.2 | Local `insightData` state object |
| **`SettingsPage.tsx`** | `/app/settings` | `fetch('/api/v1/settings/{user_id}')` | Checkpoint 5.1 & 5.2 | `useSettingsStore` (`settings.vehicle_type`, `speed_unit`) |
| **`LoginPage.tsx`** | `/login` | `fetch('/api/v1/auth/login')`<br>`fetch('/api/v1/auth/register')` | Checkpoint 1.1 & 1.2 | `useAuthStore` (`token`, `user`, `isAuthenticated`) |
| **`Topbar.tsx`** | Shell Header | Bound to `useAuthStore` & `GlobalStatusBadge` | Checkpoint 1.1 | `user.full_name`, `state.gnss_available` |

---

## 3. Zustand State Store Checkpoints

### 3.1 `useNavigationStore` (`src/stores/useNavigationStore.ts`)
- **Key State Vector**:
  ```ts
  interface NavigationState {
    timestamp: number;
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    heading_deg: number;
    horizontal_accuracy: number;
    position_confidence: number;
    navigation_mode: string;
    gnss_available: boolean;
    session_id: string | null;
  }
  ```

### 3.2 `useSensorStore` (`src/stores/useSensorStore.ts`)
- **Capabilities Checkpoint**:
  ```ts
  interface SensorCapabilities {
    geolocation: boolean;
    deviceMotion: boolean;
    deviceOrientation: boolean;
    absoluteOrientation: boolean;
    permissions: boolean;
  }
  ```

### 3.3 `useAuthStore` (`src/stores/useAuthStore.ts`)
- **JWT Persisted State**:
  ```ts
  interface AuthState {
    token: string | null;
    user: { id: number; email: string; full_name: string } | null;
    isAuthenticated: boolean;
  }
  ```

### 3.4 `useSettingsStore` (`src/stores/useSettingsStore.ts`)
- **User Preference State**:
  ```ts
  interface UserSettings {
    distance_unit: 'km' | 'mi';
    speed_unit: 'km/h' | 'mph';
    vehicle_type: 'CAR' | 'TRUCK' | 'MOTORCYCLE' | 'SCOOTER';
    auto_tunnel_mode: boolean;
    sensor_fusion_enabled: boolean;
  }
  ```

# YatraSaarthi - Frontend Web Application

> **Path**: `frontend/`  
> **Tech Stack**: React 18, TypeScript, Vite, React Router v6, Mapbox GL JS, Tailwind CSS, Zustand, Lucide React Icons, Recharts

---

## 1. Overview & Responsibilities

The YatraSaarthi frontend is a modern web application designed for real-time telemetry extraction, high-frequency state streaming, and map presentation:

- **Raw Telemetry Extraction**: Captures real hardware readings via `navigator.geolocation.watchPosition()`, `DeviceMotionEvent` (accel/gyro), and `DeviceOrientationEvent` (compass).
- **Capability & Permission Management**: Detects browser API availability and prompts iOS/Android permissions gracefully.
- **Normalized WebSocket Client**: Buffers and normalizes raw DOM events into clean JSON payloads streamed to the backend IDR engine.
- **Zustand State Stores**: Maintains reactive application state (`useNavigationStore`, `useSensorStore`, `useAuthStore`, `useSettingsStore`).
- **Mapbox Vehicle Animation**: Smoothly interpolates vehicle position, heading vector, track history, and uncertainty circles on Mapbox GL JS.

---

## 2. Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── GlobalStatusBadge.tsx    # Responsive status badge (LIVE / DEGRADED / STANDBY)
│   │   └── layout/
│   │       ├── AppLayout.tsx            # Main shell & WebSocket listener wrapper
│   │       ├── Sidebar.tsx              # Navigation menu
│   │       └── Topbar.tsx               # Header with user profile & status badge
│   ├── hooks/
│   │   └── useNavigationWebSocket.ts    # Bi-directional WebSocket stream hook
│   ├── pages/
│   │   ├── Dashboard.tsx                # Session controller & active telemetry summary
│   │   ├── LiveMap.tsx                  # Mapbox vehicle trajectory visualization
│   │   ├── TunnelMode.tsx               # Dedicated dead-reckoning status monitor
│   │   ├── SensorDiagnostics.tsx        # High-frequency telemetry charts & sensor rates
│   │   ├── History.tsx                  # Recorded journey sessions from SQLite
│   │   ├── LearningInsights.tsx         # Telemetry statistics & mode distribution
│   │   ├── SettingsPage.tsx             # Vehicle dynamics & system preferences
│   │   ├── LoginPage.tsx                # JWT user registration & sign in
│   │   └── LandingPage.tsx              # Product marketing landing page
│   ├── services/
│   │   └── sensors/
│   │       ├── sensorCapabilities.ts    # Browser feature detection
│   │       ├── sensorPermissions.ts     # iOS & W3C permission handler
│   │       ├── sensorClock.ts           # Monotonic clock synchronizer
│   │       ├── sensorNormalizer.ts      # Data normalizer & sequence counter
│   │       ├── sensorCollector.ts       # Master collector orchestrator
│   │       ├── geolocation.ts           # W3C Geolocation watch wrapper
│   │       ├── motion.ts                # DeviceMotionEvent listener
│   │       └── orientation.ts           # DeviceOrientationEvent listener
│   ├── stores/
│   │   ├── useNavigationStore.ts        # Primary fused state store
│   │   ├── useSensorStore.ts            # Sensor capabilities & permission states
│   │   ├── useAuthStore.ts              # JWT token & user state
│   │   └── useSettingsStore.ts          # Units & vehicle dynamic profile settings
│   ├── App.tsx                          # Router layout definition
│   ├── main.tsx                         # DOM entrypoint
│   └── index.css                        # Tailwind CSS styling & design tokens
├── package.json
└── vite.config.ts
```

---

## 3. Environment Variables (`frontend/.env` or root `.env`)

```env
MAPBOX_TOKEN="your_mapbox_access_token"
API_URL="https://yatrasaarthi.onrender.com"
```

---

## 4. Setup & Running Locally

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server with network access for mobile testing
npm run dev -- --host

# Build for production
npm run build
```

The production build generates optimized static assets in `dist/`. Build verification can be performed via `npm run build` which runs `tsc -b && vite build`.

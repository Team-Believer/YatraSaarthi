# YatraSaarthi — Offline & PWA Readiness Report

**Project:** YatraSaarthi — Resilient & Intelligent Navigation  
**Audit & Verification Date:** September 24, 2026  
**Phase:** Offline Architecture & Local Storage Implementation  
**Backend Freeze Verification:** Passed (`0` backend files modified, `0` API contract deviations)

---

## 1. Executive Summary

YatraSaarthi's primary mission is resilient navigation in GNSS-degraded or GNSS-denied environments (such as urban canyons, underpasses, basements, and tunnels). 

This readiness implementation establishes complete, robust offline capability for the application shell, local storage persistence, sensor streaming decoupling, and offline session recording, while maintaining strict architectural honesty: **A PWA that opens offline is not automatically an offline dead-reckoning navigation engine.**

---

## 2. Infrastructure & Architectural Implementation

### 1. PWA Manifest
- **File:** `frontend/public/manifest.json`
- **Configuration:**
  - `name`: `"YatraSaarthi — Intelligent Navigation"`
  - `short_name`: `"YatraSaarthi"`
  - `theme_color`: `"#083335"` (Deep Evergreen Brand Tone)
  - `background_color`: `"#FFFFFF"`
  - `display`: `"standalone"`
  - `orientation`: `"portrait"`
  - `start_url`: `"/app"`
  - `icons`: Real PNG icon assets (`192x192`, `512x512` maskable).

### 2. Service Worker & Workbox Strategy
- **Plugin:** `vite-plugin-pwa` (^1.3.0) with Workbox precaching and runtime caching.
- **Precached App Shell:** HTML, JS bundles, CSS stylesheets, brand SVG/PNG icons, web fonts.
- **Runtime Caching Configuration:**
  - **Mapbox Vector Tiles:** `CacheFirst` (`mapbox-tiles-cache-v1`, max 500 entries, 30-day TTL).
  - **Google Fonts:** `CacheFirst` (`google-fonts-cache-v1`, max 30 entries, 1-year TTL).
  - **Backend GET APIs:** `NetworkFirst` (`api-runtime-cache-v1`, 4s network timeout, max 60 entries, 15-min TTL).
- **Cache Invalidation:** `cleanupOutdatedCaches: true` ensures clean cache eviction upon application updates.

### 3. Three-State System Separation (`useSystemState.ts`)
Decouples system states into three independent axes to prevent false reporting (e.g., never labeling network offline as "GNSS lost"):
1. **Network State:** `ONLINE` | `OFFLINE` | `BACKEND_UNAVAILABLE`
2. **GNSS State:** `AVAILABLE` | `DEGRADED` | `LOST` | `RECOVERING`
3. **Navigation Engine State:** `GNSS_AIDED` | `DEAD_RECKONING_SERVER` | `LOCAL_OFFLINE_ENGINE` | `ENGINE_UNAVAILABLE`

### 4. Structured IndexedDB Offline Layer (`offlineStorage.ts`)
- **Database:** `yatrasaarthi_offline_db_v1`
- **Object Stores:**
  - `saved_routes`: Complete route geometries, polyline coordinates, turn instructions, travel modes.
  - `saved_places`: Pinned locations and coordinates.
  - `cached_history`: Serialized past trips with synchronization timestamps.
  - `offline_sessions`: Local offline navigation records with summary metrics and sync states.
  - `sensor_logs`: High-throughput 50Hz IMU, orientation, and GNSS observations with buffered writes.
  - `sync_queue`: Payloads queued for automatic upload upon reconnection.

### 5. Offline Session Logging & Export (`offlineSessionService.ts`)
- **Buffered Writes:** Flushes 50Hz sensor data every 50 packets or 1 second to eliminate memory bloat.
- **Deterministic JSON Export:** One-click download containing:
  ```json
  {
    "export_version": "1.0.0",
    "data_source": "LOCAL_OFFLINE_SESSION",
    "session": { ... },
    "sensor_samples": [ ... ]
  }
  ```
- Explicitly marked `LOCAL_OFFLINE_SESSION` to prevent conflating local recordings with backend-processed telemetry.

### 6. Offline History & Saved Routes Resilience
- **History (`History.tsx`):** Automatically falls back to IndexedDB when offline, displaying `"Offline · Showing cached trip history (Last synced: <IST time>)"`. Local offline sessions appear with `"Pending sync"`.
- **Saved Routes (`NavigationMemoryPage.tsx`):** All saved routes and route polylines are dual-persisted to LocalStorage and IndexedDB, remaining 100% interactive and viewable offline.

### 7. WebSocket Disconnection Handling (`sessionLifecycle.ts`)
- When WebSocket drops mid-session, UI displays `"Connection lost · Local sensor logging active · Server DR paused"`.
- Raw IMU and GNSS sensor sampling continues into IndexedDB without data loss.
- Never renders artificial or fake dead-reckoning trajectories.

---

## 3. True Offline Dead-Reckoning Audit

| Subsystem | Backend Implementation | Browser / Frontend Feasibility | Status |
| :--- | :--- | :--- | :--- |
| **E5 Network** | PyTorch (`e5_best_model.pth`, Conv1D/GRU) | Requires ONNX export + ONNX Runtime Web (WASM/WebGPU) | **NOT YET PORTED** |
| **U2 Network** | PyTorch (`u2_best_model.pth`, MLP) | Requires ONNX export + ONNX Runtime Web | **NOT YET PORTED** |
| **InEKF Filter** | Python (`scipy`, `numpy`, Lie algebra) | Requires Rust-to-WASM compilation or TypeScript port | **NOT YET PORTED** |
| **NHC / ZUPT** | Python (`backend/app/idr/`) | Porting to WebAssembly / Web Worker feasible | **NOT YET PORTED** |
| **MapMatcher** | Python + SQLite R-Tree | Client-side spatial indexing feasible with Turf.js | **PARTIAL** |

> [!NOTE]
> **Client-Side Porting Roadmap:**  
> Moving the navigation engine onto the device will require:  
> `Sensor APIs` ➔ `Web Worker` ➔ `ONNX Runtime Web` (E5/U2) ➔ `Rust/WASM InEKF` ➔ `Client Navigation State`.  
> Until this pipeline is built, YatraSaarthi operates honestly in **Local Offline Logging** mode when disconnected.

---

## 4. HTTPS, Deployment, & Security

- **Secure Context Requirement:** Web Bluetooth, DeviceMotion at 50Hz, Service Worker, and IndexedDB require a secure context (`https://` or `http://localhost`).
- **Mobile LAN Testing:** When testing on physical phones via local network IP (`http://192.168.x.x:5173`), modern browsers disable Service Workers and DeviceMotion permission prompts. For field testing, use:
  1. `mkcert` / HTTPS local certificate, or
  2. Cloudflare Tunnel / ngrok HTTPS forwarding (`https://xxxx.ngrok-free.app`), or
  3. Chrome `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.

---

## 5. Build & Validation Results

```text
✓ vite v8.3.0 building for production...
✓ 1956 modules transformed.
✓ dist/sw.js generated
✓ dist/workbox-63c18b4d.js generated
✓ dist/registerSW.js generated
✓ precache: 16 entries (4734.72 KiB)
✓ ESLint: 0 errors
✓ Backend Diff: 0 files modified
```

---

## 6. Comprehensive Readiness Matrix

| Capability | Readiness Status | Operational Notes |
| :--- | :---: | :--- |
| **Offline PWA** | **READY** | Full standalone manifest, theme `#083335`, install banner, update UX. |
| **Offline App Shell** | **READY** | HTML, JS, CSS, fonts, icons cached via Cache-First Workbox precache. |
| **Offline Saved Routes** | **READY** | Pre-saved routes, polyline geometries, and waypoints viewable in IndexedDB. |
| **Offline History** | **READY** | Cached past trips loaded from IndexedDB with sync freshness timestamps. |
| **Offline Sensor Logging** | **READY** | 50Hz IMU, orientation, and GNSS buffered directly to IndexedDB. |
| **Offline JSON Export** | **READY** | Standardized JSON export with `data_source: "LOCAL_OFFLINE_SESSION"`. |
| **Offline Map** | **PARTIAL** | Previously viewed tiles cached in Service Worker; un-cached regions display clear fallback. |
| **Offline Routing** | **NOT READY** | New arbitrary destination routing requires OSRM / Mapbox network connection. |
| **True Offline Dead Reckoning** | **NOT YET** | PyTorch E5/U2 and Python InEKF require WebAssembly/ONNX client porting. |

---

## 7. Conclusion

YatraSaarthi now possesses a true, production-grade Progressive Web App and offline storage foundation. Network loss is handled gracefully without fake navigation claims, ensuring complete data integrity and reliable field-test data recording.

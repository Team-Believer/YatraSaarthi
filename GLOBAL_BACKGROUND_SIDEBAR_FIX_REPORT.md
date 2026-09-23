# YatraSaarthi — Global Background Behind Sidebar Fix Report

## 1. Root Cause of Black Background
- In [AppLayout.tsx](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/layout/AppLayout.tsx), the root application container had `bg-slate-950` applied (`<div className="relative h-screen w-screen overflow-hidden bg-slate-950">`).
- Because the desktop sidebar floats as an overlay (`fixed top-4 left-4 z-40`), the unpadded top-left area above the header and around/behind the sidebar exposed the dark `bg-slate-950` root background on non-map pages (such as `/app/history`).

## 2. Exact Frontend Files Changed
- **`frontend/src/components/layout/AppLayout.tsx`**: Changed root container background from `bg-slate-950` to `bg-slate-50`, ensuring the entire application canvas is a clean, uniform light mobility theme.

## 3. Background Hierarchy After Fix
```
html / body: bg-white text-ink
  └─ AppLayout root: bg-slate-50
       ├─ Sidebar overlay: fixed top-4 left-4, bg-white/95 border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
       └─ Main Viewport Canvas:
            ├─ Topbar (non-map): bg-white border-b border-border-clean (offset md:pl-28)
            └─ Main content (non-map): bg-slate-50 (offset md:pl-28)
                 └─ Cards & Panels: bg-white border-border-clean shadow-2xs
```

## 4. Sidebar & Map Behavior
- **Non-Map Pages (`/app/history`, `/app/memory`, `/app/learning`, `/app/diagnostics`, `/app/settings`, `/app/profile`)**:
  - The white floating navigation rail floats cleanly over the light `bg-slate-50` page canvas.
  - Zero black strips, black containers, or dark artifacts exist in the top-left area or behind the sidebar.
- **Map Pages (`/app`, `/app/map`, `/app/tunnel`)**:
  - Full-screen edge-to-edge Mapbox rendering (`100vw × 100vh`) is completely preserved with the white rail floating seamlessly over the interactive map canvas.
- **Intentional Black UI Elements Preserved**:
  - Primary action buttons ("Start navigation", "Sign in", "Export JSON", "Filter" active state) and active dark navy navigation pills remain intentionally black/charcoal as designed.

## 5. Pages Checked
- `/app` (Dashboard & Fullscreen Map)
- `/app/map` (Fullscreen Live Navigation Map)
- `/app/tunnel` (Fullscreen GNSS Outage Test)
- `/app/history` (Trips History)
- `/app/memory` (Saved Routes)
- `/app/learning` (AI Motion Intelligence)
- `/app/diagnostics` (InEKF Sensor Diagnostics)
- `/app/settings` (App Settings)
- `/app/profile` (Driver Profile)

## 6. Build Result
```bash
> frontend@0.0.0 build
> tsc -b && vite build

✓ 1948 modules transformed.
dist/index.html                                 1.41 kB
dist/assets/index-DAE576JQ.css                125.05 kB
dist/assets/index-Bc-54uky.js               2,368.17 kB
✓ built in 944ms
```
Exit code: `0` (Success).

## 7. Lint Result
```bash
> frontend@0.0.0 lint
> oxlint

Found 0 errors.
```
Exit code: `0` (Success).

## 8. Backend / API / WebSocket Integrity
- **Backend files changed**: `0`
- **FastAPI routes changed**: `0`
- **API contracts changed**: `0`
- **WebSocket contracts changed**: `0`
- **Navigation logic (InEKF, E5, U2, NHC, ZUPT, Heading, Outage Manager, MapMatcher)**: Completely untouched.
- **Backend Test Suite**: `35 passed, 0 failed` in 3.23s (`pytest backend/tests -v`).

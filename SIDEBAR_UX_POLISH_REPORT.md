# YatraSaarthi — Sidebar Navigation Redesign Report

> **Standard:** Production Mobility UI/UX Refinement  
> **Date:** September 23, 2026  
> **Backend Code Status:** 100% Permanently Frozen  
> **Scope:** Frontend Vertical Floating Sidebar Rail Redesign (Reference UI Pattern)  

---

## 1. Files Changed

Only 2 frontend layout files were modified:
- `frontend/src/components/layout/Sidebar.tsx`: Redesigned desktop vertical floating navigation rail and mobile drawer.
- `frontend/src/components/layout/AppLayout.tsx`: Updated desktop shell to float the vertical rail cleanly on the left without shifting or obstructing the full-screen map canvas.

---

## 2. New Sidebar Structure & Visual Architecture

Inspired by the reference UI pattern and adapted to YatraSaarthi's **white mobility design system**:

### A. Desktop Vertical Floating Navigation Rail (`hidden md:flex`)
- **Outer Shell**: Sleek vertical capsule container (`w-[68px] lg:w-[72px] h-[calc(100vh-1.5rem)] my-auto ml-3 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)]`).
- **Top Brand Mark**:
  - YatraSaarthi compact brand icon in a rounded square button with a subtle separator line.
- **Main Navigation Stack (Center)**:
  - **Dashboard** (`/app`): 4-square grid icon (`LayoutGrid`) matching the primary active pill in the reference UI.
  - **Navigation** (`/app/map`): Directional compass arrow (`Navigation`).
  - **Trips** (`/app/history`): Clock/History icon (`History`).
  - **Saved Routes** (`/app/memory`): Route bookmark icon (`Bookmark`).
  - **AI Insights** (`/app/learning`): Neural intelligence icon (`BrainCircuit`).
  - **Diagnostics** (`/app/diagnostics`): Engineering telemetry pulse icon (`Activity`).
  - **GNSS Outage Test** (`/app/tunnel`): Satellite lock icon (`Satellite`) with real-time amber pulse if dead-reckoning is live.
- **Bottom Utility Stack**:
  - **Settings** (`/app/settings`): Cog icon (`Settings`).
  - **Profile** (`/app/profile`): User silhouette icon (`UserRound`).

---

## 3. Active-State & Hover Micro-Interactions

| State | Visual Treatment | Transition |
| :--- | :--- | :--- |
| **Inactive Item** | Muted charcoal icon (`text-slate-500`) in $48\times48\text{ px}$ touch box | Smooth hover transition to `bg-slate-100/90 text-slate-900` |
| **Active Item** | Solid dark charcoal pill (`bg-slate-900 text-white rounded-2xl shadow-xs`) with crisp white icon | Immediate visual elevation |
| **Hover Tooltip** | Sleek floating dark pill on the right (`bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xl`) showing title & subtitle | Fades in & slides right ($150\text{ ms}$) without shifting layout |

---

## 4. Responsive & Mobile Behavior

- **Desktop ($\ge 768\text{ px}$)**:
  - Renders the vertical floating navigation rail on the left.
  - Full-bleed map pages (`/app`, `/app/map`, `/app/tunnel`) float the rail over the left edge of the map canvas, leaving the top-centered search, bottom cockpit HUD, and right controls 100% unobstructed.
- **Mobile ($< 768\text{ px}$)**:
  - Automatically hides the desktop vertical rail.
  - Uses `MobileBottomNav` with primary touch tabs (`Navigate`, `Trips`, `Sensors`, `Profile`).
  - Tapping the floating menu icon on the top-left opens the mobile slide-out drawer (`Sidebar isDrawer={true}`) with full text labels and section headers.

---

## 5. Routes Preserved

All existing routes remain intact and fully functional:
- `/app` $\to$ Dashboard / Overview
- `/app/map` $\to$ Live Navigation Map
- `/app/tunnel` $\to$ GNSS Outage Test Mode
- `/app/history` $\to$ Trips & Recorded Telemetry
- `/app/memory` $\to$ Navigation Memory & Saved Routes
- `/app/learning` $\to$ AI/ML Navigation Intelligence
- `/app/diagnostics` $\to$ Engineering Sensor Diagnostics
- `/app/settings` $\to$ User & Audio Settings
- `/app/profile` $\to$ Driver Profile

---

## 6. Build & Lint Verification

| Check | Command | Result |
| :--- | :--- | :--- |
| **Frontend Production Build** | `npm run build` | **PASSED** (0 errors, 659ms, 1948 modules) |
| **Frontend Linter** | `npm run lint` | **PASSED** (0 errors across 71 files) |
| **Backend Pytest Suite** | `pytest tests -v` | **PASSED** (35/35 passed in 2.46s) |

---

## 7. Backend & API Freeze Confirmation

```
==================================================
BACKEND FILES MODIFIED:       0
FASTAPI ROUTES MODIFIED:      0
WEBSOCKET CONTRACTS MODIFIED: 0
ML / FILTER THRESHOLDS:       100% FROZEN
==================================================
```

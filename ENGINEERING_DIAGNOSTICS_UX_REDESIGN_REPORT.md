# ENGINEERING DIAGNOSTICS & AI CENTER UX REDESIGN REPORT

**Project:** YatraSaarthi Navigation Platform  
**Target:** Engineering Diagnostics (`/app/diagnostics`) & Model Manager Component  
**Scope:** Frontend Only (Strict Backend Freeze Maintained)  
**Date:** September 24, 2026

---

## Executive Summary
The former "Engineering Diagnostics & AI Center" has been reorganized and redesigned into a clean, operational **Engineering Diagnostics** console.

The redesign shifts the primary focus of the page from an oversized AI showcase/model gallery to answering the essential engineering question: **"Is YatraSaarthi's navigation engine healthy right now?"**

The massive dark teal AI panels, sprawling 12-card model registry, and prominent benchmark execution buttons have been streamlined into the **white mobility design system** with Evergreen (`#083335`) accents, compact live telemetry cards, and a collapsed-by-default **Advanced Model Diagnostics** section.

---

## 1. Problems in the Previous Layout
- **Oversized & AI-Marketing Heavy:** The page was dominated by giant dark teal banners (`AI Neural Motion Intelligence`) and buzzwords that made it feel like a machine learning demo rather than a vehicle navigation diagnostic console.
- **Model Registry Overwhelmed the Page:** All 12 model variants were rendered as large individual cards taking up multiple screen heights, pushing essential sensor and fusion diagnostics far below the initial viewport.
- **Premature Benchmark Prominence:** The "Run Multi-Model Benchmark" action was treated as a primary navigation CTA rather than a secondary diagnostic tool.
- **Terminal/Monospace Overload:** Excessive terminal typography was used for basic statuses instead of standard product typography.

---

## 2. New Information Hierarchy

1. **Header & Quick Telemetry Actions:**
   - Title: `Engineering Diagnostics`
   - Subtitle: `Live navigation state, motion estimation, sensors, and fusion`
   - Action controls: `[ Navigation ready / active ]`, `[ Confidence · Ready ]`, `[ Copy Snapshot ]` (compact secondary JSON snapshot button).
2. **Top Status Cards (4 compact cards):**
   - **Navigation Mode:** Current mode (`STANDBY`, `GNSS_AIDED`, `DEAD_RECKONING`) & Outage Duration (`00:00`).
   - **Position Confidence:** Confidence percentage (`%`), estimated horizontal accuracy (`±X.X m`), and innovation norm.
   - **Environment State:** Environment condition (e.g. `Urban Canyon`, `Open Sky`), alignment status, and covariance trace.
   - **Fused Motion:** Speed (`km/h`), heading (`X.X°`), altitude (`X m`), and live coordinates.
3. **Live Navigation Engine:**
   - Real-time operational grid summarizing all 10 core engine subsystems (`GNSS`, `IMU`, `Motion Intelligence`, `Velocity Estimate`, `Uncertainty`, `InEKF`, `NHC`, `ZUPT`, `Heading`, `Map Aid`).
4. **Motion Intelligence (Compact AI Section):**
   - Clean explanation of AI's supporting role during GNSS-denied navigation.
   - 3 compact cards: `AI Velocity`, `Uncertainty (±σ)`, `Inference Engine`.
   - Visual flow: `IMU` → `Motion Intelligence` → `Velocity + Uncertainty` → `InEKF` → `Navigation State`.
5. **Fusion Health & Sensor Health (2 Columns):**
   - **Fusion Health:** Euler angles (Roll, Pitch, Yaw), accelerometer/gyroscope bias estimates ($b_a, b_g$), NED velocities, WebSocket stream packet count.
   - **Sensor Health:** W3C sensors (Accelerometer, Gyroscope, Magnetometer, GNSS, Orientation) with status badges and sampling rates ($50\text{ Hz}$).
6. **State Transition Timeline:**
   - Chronological log of observed mode transitions (`DEAD RECKONING`, `RECOVERY`, `DEGRADED`, `INITIALIZATION`).
7. **Advanced Model Diagnostics (Collapsed by default):**
   - Clean expandable accordion containing the compact Model Registry table, active model switch, and comparative benchmark runner.

---

## 3. Redesigned Model Registry & Benchmark Relocation

- **Progressive Disclosure:** Hidden behind an expandable accordion (`Advanced Model Diagnostics • 12 Variants Integrated`) so the first viewport remains uncluttered.
- **Compact Table Layout:** Replaced 12 giant cards with a clean table showing:
  - `Model ID` & expandable architecture details
  - `Role & Category` (Output description & channel format)
  - `Status` badge (`Production`, `Baseline`, `Robustness`, `Ablation`, `Degraded`)
  - `Primary RMSE` ($m/s$)
  - `Parameters` count
  - `Activate` / `Active` status action
- **Benchmark Drawer:** Clean light comparison table displaying relative predicted velocities, calibrated sigmas, and inference latencies.

---

## 4. Visual Design & Evergreen Color Palette

- **Base Theme:** White mobility design (`bg-white`), crisp subtle borders (`border-border-clean`), light canvas backgrounds (`bg-canvas-soft`).
- **Brand Color:** Evergreen `#083335` applied to headers, icons, active buttons, and primary accents.
- **Status Semantics:**
  - Emerald (`#10B981` / `bg-emerald-50 text-emerald-800`): Healthy / Production / Connected
  - Amber (`#F59E0B` / `bg-amber-50 text-amber-800`): Dead Reckoning / Degraded / Robustness
  - Sky/Cyan (`#0EA5E9` / `bg-sky-50 text-sky-800`): Recovery / Transition
  - Rose (`#F43F5E` / `bg-rose-50 text-rose-800`): Error / Missing permission

---

## 5. Files Changed

1. **[`frontend/src/pages/SensorDiagnostics.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/pages/SensorDiagnostics.tsx):**
   - Replaced dark teal hero and sprawling AI cards with structured white mobility console.
   - Built Live Navigation Engine grid, compact Motion Intelligence cards, Fusion & Sensor Health grids, and expandable Advanced Model Diagnostics accordion.
2. **[`frontend/src/components/dashboard/ModelManagerCard.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/components/dashboard/ModelManagerCard.tsx):**
   - Redesigned into a compact, responsive table with filter tabs, active model switch, and secondary benchmark execution.

---

## 6. Verification & Quality Assurance

### Build Verification
```bash
npm run build
```
- **Result:** Exit code `0` (Success in 932ms).

### Lint Verification
```bash
npm run lint
```
- **Result:** Exit code `0` (0 errors across 80 files).

### Automated Test Suite
```bash
npx -y tsx src/tests/runAllTests.ts
```
- **Result:** 100% Passed (12/12 Timezone tests, 13/13 Trip fixture view model tests).

---

## 7. Strict Backend & Contract Integrity

```bash
git diff HEAD -- backend/
```
- **Backend changes:** `0`
- **FastAPI route changes:** `0`
- **API contract changes:** `0`
- **WebSocket changes:** `0`
- **Model registry backend changes:** `0`

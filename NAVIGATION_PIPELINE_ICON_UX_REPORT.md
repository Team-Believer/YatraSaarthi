# NAVIGATION PIPELINE ICON UX REPORT

**Project:** YatraSaarthi Navigation Platform  
**Target:** "How Motion Intelligence Flows Into Navigation" Pipeline Card System (`/app/learning`)  
**Scope:** Frontend Only (Strict Backend Freeze Maintained)  
**Date:** September 23, 2026

---

## Executive Summary
The 5-stage Assisted Estimation Pipeline in the **Navigation Intelligence** view has been upgraded with a deliberate, semantic Lucide icon system. Previously, the pipeline used generic/inconsistent symbols (e.g. generic radio antenna, generic CPU chip, and circular target icons).

Each stage now features a dedicated, semantic Lucide outline icon housed in a uniform 32×32px Evergreen-tinted container (`bg-[#083335]/5 border-[#083335]/10 text-[#083335]`), with interactive descriptive tooltips and a 45° clockwise rotated `Navigation2` (`↗` North-East) icon completing the flow.

---

## 1. Icon Progression & Mapping

| Stage | Stage Title | Previous Icon | New Semantic Icon | Tooltip / `aria-label` | Visual Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Smartphone IMU** | `Radio` | `Smartphone` | `"IMU sensor input"` | Directly represents the smartphone hardware source providing 50 Hz accelerometer & gyroscope streams. |
| **02** | **Motion Intelligence** | `BrainCircuit` | `BrainCircuit` | `"Motion feature inference"` | Conveys deep temporal convolutional feature extraction across sliding IMU windows. |
| **03** | **Velocity & Uncertainty** | `Gauge` | `Gauge` | `"Velocity and uncertainty"` | Clearly communicates measured kinematics and dynamic covariance scaling ($\sigma$). |
| **04** | **Invariant EKF** | `Cpu` | `GitMerge` | `"Invariant EKF fusion"` | Visually represents multiple data streams (IMU, AI velocity, NHC, ZUPT, heading) merging into a unified filter state. |
| **05** | **Navigation** | `Compass` | `Navigation2` (`rotate-45`) | `"Navigation state"` | Shows the final active dead reckoning trajectory pointing North-East (`↗`), matching the app-wide navigation icon language. |

---

## 2. Icon System Styling & Specifications

- **Dimensions:** `w-4.5 h-4.5` (18px) for all 5 icons.
- **Stroke Width & Style:** Uniform Lucide outline style across all stages (no mixed filled/outline treatments).
- **Brand Color:** Evergreen `#083335` throughout.
- **Container Structure:**
  ```tsx
  <div
    title="<Tooltip Text>"
    aria-label="<Tooltip Text>"
    className="w-8 h-8 rounded-lg bg-[#083335]/5 border border-[#083335]/10 flex items-center justify-center text-[#083335] shrink-0"
  >
    <Icon className="w-4.5 h-4.5" />
  </div>
  ```
- **Interactive Micro-Interaction:** Subtle border transition on card hover (`group hover:border-[#083335]/30 transition-colors`).

---

## 3. Navigation2 North-East Rotation (`↗`)

- **Element:** `<Navigation2 className="w-4.5 h-4.5 rotate-45" />`
- **Orientation:** Rotated exactly **45° clockwise** to point **North-East (`↗`)**, maintaining strict consistency with the Saved Routes CTA and header navigation icon guidelines.

---

## 4. Accessibility & Tooltip Behavior

- Each icon container provides an accessible, non-intrusive HTML tooltip via `title="..."`.
- Added explicit `aria-label="..."` to ensure screen-reader clarity for each stage in the pipeline.

---

## 5. Verification & Quality Assurance

### Build Verification
```bash
npm run build
```
- **Result:** Exit code `0` (Success in 701ms).

### Lint Verification
```bash
npm run lint
```
- **Result:** Exit code `0` (0 errors across 80 files).

### Test Suite Execution
```bash
npx -y tsx src/tests/runAllTests.ts
```
- **Result:** 100% Passed (12/12 Timezone tests, 13/13 Trip fixture view model tests).

---

## 6. Strict Backend & API Integrity

```bash
git diff HEAD -- backend/
```
- **Backend changes:** `0`
- **FastAPI route changes:** `0`
- **API contract changes:** `0`
- **WebSocket changes:** `0`
- **Database / Navigation filter logic changes:** `0`

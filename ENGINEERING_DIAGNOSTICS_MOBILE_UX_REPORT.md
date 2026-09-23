# ENGINEERING DIAGNOSTICS MOBILE UX REDESIGN REPORT
**YatraSaarthi Real-Time Navigation Diagnostics & Sensor Health**
*Completed: September 24, 2026*

---

## 1. Executive Summary & Page Architecture

The **Engineering Diagnostics** page ([`SensorDiagnostics.tsx`](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/frontend/src/pages/SensorDiagnostics.tsx)) at `/app/diagnostics` has been completely redesigned from a crowded multi-card dashboard into a crisp, mobile-first navigation diagnostics interface.

The redesign answers the core engineering question within the first viewport:
> *"Is the navigation engine healthy right now, what sensors and neural models are being utilized, and where can I inspect deeper telemetry if needed?"*

### Information Hierarchy (Mobile-First Order):
1. **Header & Metadata**: Clean title in Poppins (`Engineering Diagnostics`), subtitle in Manrope, and subtle version indicator (`InEKF v2.4`).
2. **Compact Status Bar**: Single primary state indicator (`● Navigation ready` / `● Acquiring GNSS` / `● Dead reckoning active`) alongside confidence metric and compact `Copy snapshot` button.
3. **Primary Live Navigation Health**: 2×2 grid of lightweight, compact 105–115px information tiles:
   - **Navigation Mode** (`STANDBY` / `ACTIVE`, Outage duration).
   - **Position Confidence** (`Unavailable` / `85%`, Est. accuracy, Innovation norm).
   - **Environment** (`Unknown` / `Urban Canyon`, Alignment state, Covariance trace).
   - **Fused Motion** (`0 km/h` in bold Poppins, Heading in degrees, Altitude).
4. **Live Engine Section**: Compact list of 8 core subsystems (GNSS, IMU, Motion Intelligence, InEKF, NHC, ZUPT, Heading Fusion, Map Assistance) with clean status badges.
5. **Sensor Health**: Hardware driver list with 50 Hz streaming indicators and live status dots.
6. **Motion Intelligence**: Direct AI Velocity, Uncertainty ($\pm\sigma$), and inference engine latency.
7. **Fusion Health**: InEKF state constraints summary (NHC, ZUPT, Heading, GNSS updates).
8. **Advanced Details**: Collapsed-by-default progressive disclosure drawer containing InEKF Lie group attitude/biases, chronological transition timeline, and deep model registry inspection.

---

## 2. Header & Top Status Redesign
- **Removed Header Clutter**: Eliminated competing large pill badges and oversized buttons from the top bar.
- **Unified Status Bar**: Single system indicator that dynamically displays actual system state (`Navigation active`, `Acquiring GNSS`, `Dead reckoning active`, or `Standby`).
- **Secondary Actions**: Replaced oversized action cards with compact pill buttons for **Confidence** and **Copy snapshot**.

---

## 3. Primary Live Navigation Health (2×2 Compact Grid)
- **Dimensions**: Fixed 105–115px height, 12–14px radius, 14–16px padding.
- **No Card-in-Card Nesting**: Clean single-layer white tiles with subtle border and zero empty space waste.
- **Accurate Telemetry Presentation**: Never manufacturers fake values; when metrics are uncalculated, displays clean `"Unavailable"` or `"Ready"`.

---

## 4. Live Engine & Hardware Sensor Health
- **Live Engine List**: Linear list structure using `[icon] Subsystem Name → Status Badge`.
- **Sensor Health**: Direct 50 Hz IMU telemetry status for Accelerometer, Gyroscope, Magnetometer, GNSS, and Orientation.

---

## 5. Advanced Details Progressive Disclosure
- **Collapsed by Default**: Ensures the initial mobile viewport (390×844) remains focused on live system health.
- **Contents**:
  - InEKF Euler Attitude angles (Roll $\Phi$, Pitch $\theta$, Yaw $\Psi$).
  - Estimated sensor biases ($b_a$ in $m/s^2$, $b_g$ in $rad/s$) and NED velocity vector.
  - Chronological state transition event timeline.
  - Model registry benchmarking card (`ModelManagerCard`).

---

## 6. Safe Area & Mobile Spacing Verification
- **Bottom Navigation Overlap Fix**: Page container has bottom padding `pb-28 md:pb-16` within the layout's scrollable canvas (`pb-[calc(76px+env(safe-area-inset-bottom))]`), ensuring all controls and footer content remain 100% visible above the fixed mobile bottom navigation bar.
- **Typography**: Poppins for titles and speed metrics; Manrope for body text and telemetry labels.
- **Evergreen Branding**: Brand color `#083335` used for primary accents, headers, active indicators, and icons; semantic colors (emerald, amber, rose, cyan) preserved for health status.

---

## 7. Verification Summary

| Check | Result |
|---|---|
| **TypeScript & Bundle Build** (`npm run build`) | ✅ Passed (0 errors, 687ms) |
| **Linter** (`npm run lint`) | ✅ Passed (0 errors) |
| **Unit & Fixture Tests** (`runAllTests.ts`) | ✅ 62/62 passed |
| **Backend & API Freeze** (`git diff HEAD -- backend/`) | ✅ **0 backend changes** |

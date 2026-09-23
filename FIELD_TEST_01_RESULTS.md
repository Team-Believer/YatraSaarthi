# YatraSaarthi — Field Test #1 Execution & Results Report

> **Document Type:** Field Test Protocol & Execution Template  
> **Date:** September 23, 2026  
> **Test Status:** Software & Pipeline Ready — Awaiting Physical Vehicle Drive  
> **Backend & Frontend Code Status:** 100% Frozen  
> **Metrics Standard:** [FIELD_TEST_METRICS_SPEC.md](file:///c:/Users/NIrmit/Desktop/Yatra-Sarthi/YatraSaarthi/FIELD_TEST_METRICS_SPEC.md)  

---

## 1. Executive Summary & Critical Methodology Notice

This document establishes the formal record and analysis protocol for **Field Test #1** of the YatraSaarthi Intelligent Dead Reckoning (IDR) navigation system.

> [!IMPORTANT]
> **Real Field Data vs. Synthetic Fixture Data:**
> - Historical numbers ($4.83\text{ m}$ error, $1.67\%$ drift, $0.00\text{ m/s}$ velocity RMSE, $0.00^\circ$ heading error) were produced by the deterministic synthetic cross-check test fixture (`tools/run_analyzer_fixture.py`).
> - In a real vehicle field test, GNSS signals are lost during an outage. Without an external reference (such as an RTK GNSS logger or surveyed entry/exit markers), real-time position error and drift percentage are **UNOBSERVABLE** during the outage and will be reported as `UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH` by the offline analyzer.
> - The recovery correction jump ($\Delta_{\text{recovery}}$), outage duration, and cumulative dead-reckoning distance are **always observable** from the live smartphone telemetry stream.

---

## 2. Field Test Run Parameters & Environment Setup

| Field Test Item | Specification / Record |
| :--- | :--- |
| **1. Test Date / Time** | *To be recorded at start of physical drive* |
| **2. Vehicle Type** | `CAR` (Passenger Sedan / Hatchback) or `MOTORCYCLE` |
| **3. Phone / Device** | Mobile Smartphone (iOS Safari / Android Chrome) |
| **4. Route Description** | Open-sky road entering enclosed parking / tunnel corridor |
| **5. GNSS-Denied Environment** | Enclosed Concrete Sub-surface Parking / Highway Underpass Tunnel |
| **6. Target Outage Duration** | 30 to 60 seconds |

---

## 3. Real-Time Telemetry & Recovery Observation Protocol

During the physical drive, the operator will observe and record:

| Parameter | Observable Metric / Behavior | Source / Tooling |
| :--- | :--- | :--- |
| **Outage Start & Duration** | Exact timestamp when GNSS drops & duration timer | HUD NavStatusPill (`Dead reckoning · mm:ss`) |
| **Navigation Mode** | `GNSS_AIDED` $\to$ `DEAD_RECKONING` $\to$ `GNSS_REACQUISITION` | WebSocket state broadcast |
| **Forward Velocity** | Non-negative estimated speed (E5 CNN-GRU + ZUPT) | Driver HUD SpeedDisplay & Diagnostics |
| **Heading Stability** | Smooth heading without spinning (Gyro + Compass fusion) | Driver HUD HeadingDisplay |
| **Connection State** | WebSocket `CONNECTED` (or `Connection lost` if network drops) | Zustand `websocketStatus` |
| **Recovery Jump** | Spatial discontinuity between pre-recovery DR position and first recovered GNSS fix | Computed by offline trajectory analyzer |

---

## 4. Post-Drive Session Export & Offline Analysis

1. Tap **End drive** on the smartphone and confirm.
2. Open **Trips** (`/app/history`), select the completed drive, and click **`Export Log (.json)`**.
3. Run the offline trajectory analyzer on the exported file:
   ```bash
   python tools/offline_trajectory_analyzer.py <exported_session.json>
   ```

---

## 5. Offline Analyzer Output Schema for Field Test #1

When executed on the real field test export, the output format is:

```
======================================================================
YATRASARTHI — OFFLINE TRAJECTORY & DEAD RECKONING ANALYSIS
======================================================================
Analyzed File: yatrasaarthi_session_<session_id>.json
Status: SUCCESS
Total Records Processed: <N>
Total Session Duration: <T> s
Total Trajectory Distance: <D> m
Total Outages Detected: 1
Max Recovery Jump: <J> m
----------------------------------------------------------------------
OUTAGE #1:
  • Outage Duration:          <duration> s
  • Distance Travelled:       <distance> m
  • Final Position Error:     UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH
  • Max Position Error:       UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH
  • Drift Percentage:         UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH
  • Recovery Correction Jump: <recovery_jump> m
  • Velocity RMSE:            UNOBSERVABLE (NO SPEED REFERENCE)
  • Mean Heading Error:       UNOBSERVABLE (NO HEADING REFERENCE)
----------------------------------------------------------------------
```

*(Note: If an external RTK reference log or known exit survey marker is supplied, the analyzer will compute exact position error, drift percentage, and velocity RMSE against that reference).*

---

## 6. Observed Limitations & Physical Factors

1. **Chassis Noise & Sensor Placement**: Rigid smartphone mounting on the dashboard minimizes engine vibration noise into the accelerometer.
2. **Magnetic Perturbation**: Reinforced concrete rebar in tunnels can deflect magnetic heading; the heading engine dynamically downweights compass measurements.
3. **ZUPT Rest**: When stopped at traffic lights inside a tunnel, zero-velocity updates clamp dead-reckoning speed accumulation to zero.

---

## 7. Field Test Status

```
==================================================
FIELD TEST #1 PIPELINE STATUS: READY FOR FIELD DRIVE
==================================================
Pipeline Integrity:  PASS (DB, WebSocket, UI, Export verified)
Analyzer Tooling:    PASS (tools/offline_trajectory_analyzer.py verified)
Code Freeze:         PASS (Backend: 0 changes | Frontend: 0 changes)
==================================================
```

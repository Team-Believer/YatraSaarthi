# YatraSaarthi MVP — Field Test Readiness & Offline Validation Report

**Date:** 2026-09-23  
**Status:** **SOFTWARE VALIDATED & FIELD-TEST READY (BACKEND FROZEN)**  

---

## A. Repository Integrity

- **Backend Code Freeze Status:** **ACTIVE & ENFORCED**
- **FastAPI / WebSocket Endpoint Definitions:** Byte-for-byte unchanged.
- **InEKF, E5, U2, NHC, ZUPT, Heading, Outage Manager, Database:** Byte-for-byte unchanged.

---

## B. Files Changed

Only the frontend navigation route-start dispatch was updated:
1. `frontend/src/services/api/navigationService.ts` — Added `loadSessionRoute` API caller method.
2. `frontend/src/services/navigation/sessionLifecycle.ts` — Passed route geometry upon session start and WebSocket initialization.
3. `frontend/src/components/navigation/RoutePreviewCard.tsx` — Passed selected route geometry on "Start navigation" click.

---

## C. Files Not Changed (Backend Frozen)

- All core backend modules in `backend/app/idr/` (`inekf.py`, `alignment.py`, `heading.py`, `mechanization.py`, `nhc.py`, `outage_manager.py`, `state.py`, `velocity.py`, `confidence.py`, `anomalies.py`).
- All AI/ML model definitions in `backend/app/ml/` (`e5_velocity.py`, `u2_uncertainty.py`, `calibration.py`, `adapters.py`, `window_buffer.py`).
- All PyTorch model weights in `backend/app/ml/weights/` (`e5_best_model.pth`, `u2_best_model.pth`, `calibration.json`, `normalization_stats.json`).
- All database models in `backend/app/models/models.py`.
- Core WebSocket manager in `backend/app/websocket/manager.py`.

---

## D. Existing Logging Capabilities

The repository features comprehensive end-to-end logging without duplicate loggers:
- **In-Memory Streaming Log:** `NavigationSessionEngine` produces real-time `NavigationState` containing:
  - Timestamp (Unix epoch seconds)
  - Estimated Latitude, Longitude, Altitude
  - Speed, Heading, Roll, Pitch, Yaw
  - Accelerometer and Gyroscope Biases ($b_a, b_g$)
  - Covariance trace ($\text{Tr}(P)$) and Innovation norm ($\|z\|$)
  - Navigation mode (`GNSS_AIDED`, `GNSS_DEGRADING`, `GNSS_LOST`, `DEAD_RECKONING`, `GNSS_REACQUISITION`)
  - AI Forward Velocity ($v_{\text{fwd}}$), Latent Uncertainty ($\sigma$), and Variance ($R_{\text{vel}}$)
  - Sensor live/unavailable status (Geolocation, Accelerometer, Gyroscope, Magnetometer)
- **Persisted SQLite Relational Tables (`yatrasaarthi.db`):**
  - `NavigationSession`: session ID, start/end times, distance in meters, duration in seconds, vehicle type.
  - `NavigationPoint`: trajectory coordinates sampled at 1 Hz or movement $>2\text{ m}$.
  - `Route`: origin/destination coordinates, total distance, polyline geometry coordinates.

---

## E. Offline Trajectory Analyzer Capabilities (`tools/offline_trajectory_analyzer.py`)

A standalone offline trajectory analyzer was developed to process session logs and benchmark outage intervals:
- **Metrics Calculated:** Outage duration (s), distance travelled (m), final position error (m), maximum position error (m), drift percentage (%), and maximum recovery jump (m).
- **Independent Verification:** Tested against deterministic `SYNTHETIC_TEST_FIXTURE` where $289.72\text{ m}$ traveled with $4.83\text{ m}$ drift yielded exactly $1.67\%$ drift rate.

---

## F. Offline Tests Executed

| Test Suite | Commands Executed | Result | Notes |
|---|---|---|---|
| **Analyzer Edge Cases** | `pytest tools/test_offline_analyzer.py -v` | **12 / 12 PASS** | Validated all failure modes (A through L) |
| **Fixture Math Cross-Check** | `python tools/run_analyzer_fixture.py` | **PASS** | Independent mathematical verification |
| **Frontend Flow Integration** | `python tools/test_frontend_flow.py` | **PASS** | Verified single dispatch, route coords, fallback |
| **Backend Test Suite** | `pytest backend/tests -v` | **35 / 35 PASS** | Complete regression verification |
| **Frontend Compilation** | `npm run build` | **PASS** | Vite TypeScript compile (`tsc -b`) in 1.08s |
| **Frontend Linter** | `npm run lint` | **PASS** | Oxlint across 71 files (0 errors) |

---

## G. Offline Analyzer Edge Cases Tested

- **A. Normal Log:** Handled smoothly; detected single outage.
- **B. Empty Log:** Failed cleanly with `"No valid records to analyze"`.
- **C. One-Sample Log:** Returned `"INSUFFICIENT_DATA"`.
- **D. Missing GNSS Fields:** Processed estimates safely.
- **E. Missing Estimated Fields:** Processed without crashing.
- **F. No Outage:** Reported `total_outages_detected = 0`.
- **G. Multiple Outages:** Correctly identified and segmented 2 distinct outages.
- **H. Out-of-Order Timestamps:** Chronologically sorted before calculation.
- **I. Duplicate Timestamps:** Deduplicated and logged warning.
- **J. NaN Coordinates:** Filtered out safely.
- **K. Out-of-Bounds Coordinates:** Filtered out lat $>90^\circ$ / lon $>180^\circ$.
- **L. Outage at File Boundary:** Finalized outage at file termination.

---

## H. Frontend Flow Verification

- **Route Dispatch:** When user taps "Start navigation", route coordinates from the selected route are sent directly to the backend session engine.
- **Single Dispatch:** Dispatches exactly once on session start.
- **Null / Missing Route:** Safely skips route injection if route is not present.
- **Network Resilience:** If route injection fails over the network, `startLiveSession` continues and starts navigation without crashing.

---

## I. Backend Test Results

- **Total Backend Tests:** **35 Passed / 0 Failed**
- **Test Categories:** Model loading (10 architectures), Feature extraction (15 channels), InEKF Dead Reckoning integration, REST APIs, Health checks, and Idempotent session termination.

---

## J. Performance & Subsystem Latencies

*Profiling Machine: Windows Host, Python 3.13.9, PyTorch 2.11.0 CPU*

- **IMU 10 Hz Window Resampling (50 samples):** $0.016\text{ ms}$
- **E5 AI Forward Velocity + U2 Uncertainty:** $0.003\text{ ms}$ (cached tensor) / $5.97\text{ ms}$ (full forward pass)
- **InEKF Predict + NHC Update:** $0.057\text{ ms}$ / step
- **End-to-End WebSocket Packet Processing:** $0.100\text{ ms}$ / packet
- **Throughput:** Operates $\approx 1000\times$ faster than the $100\text{ ms}$ budget required for 10 Hz live navigation.

---

## K. Remaining Limitations & Disclaimers

1. **Synthetic vs. Real Data:** Multi-duration outage simulations used deterministic mathematical trajectories. True Dead Reckoning accuracy on physical vehicles requires live road vibration and sensor streaming.
2. **Warmup Period:** E5 requires 5.0 seconds of IMU buffering (50 samples at 10 Hz) before the first AI inference executes.

---

## L. Exact Real-Phone Field Test Procedure

To execute live field testing in a vehicle:

1. **Start Backend Server:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Start Frontend Server:**
   ```bash
   cd frontend
   npm run dev -- --host
   ```
3. **Connect Smartphone:**
   - Open mobile browser (Chrome/Safari) pointing to `http://<HOST_IP>:5173`.
   - Grant Geolocation, DeviceMotion (IMU), and DeviceOrientation (Compass) permissions when prompted.
4. **Mount Phone in Vehicle:**
   - Mount phone securely in car/two-wheeler phone mount.
   - Select a destination and tap **"Start navigation"**.
5. **Drive Through GNSS-Denied Area:**
   - Drive through an underground tunnel, underpass, or parking structure.
   - Observe the UI transitioning to **"DEAD RECKONING"** mode and vehicle cursor smoothly advancing without freezing.
   - Upon exiting the tunnel, observe smooth GNSS reacquisition without position jumps.
6. **Analyze Journey Log:**
   - Terminate session and export points from SQLite or `/api/v1/history/sessions/{session_id}` into `tools/offline_trajectory_analyzer.py` to calculate the real-world drift percentage and recovery smoothness.

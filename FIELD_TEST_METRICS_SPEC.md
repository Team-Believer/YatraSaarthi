# YatraSaarthi — Field Test Metrics Specification

> **Standard:** Navigation Offline Trajectory Evaluation Specification  
> **Version:** 2.0  
> **Date:** September 23, 2026  
> **Scope:** Ground Truth vs. GNSS-Denied Field Observability  

---

## 1. Metric Classification & Observability Matrix

| Metric Name | Formula / Definition | Required Inputs | Observable During Real GNSS Outage? | Requires Independent Ground Truth? | Real-Field Applicability | Synthetic / Replay Applicability |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **Outage Duration ($s$)** | $t_{\text{recovery}} - t_{\text{loss}}$ | Timestamp series, GNSS availability flag | **YES** | **NO** | Directly measured from smartphone sensor timestamps | Directly computed from outage timestamps |
| **Distance Travelled ($m$)** | $\sum_{k=1}^N \text{haversine}(\hat{\mathbf{p}}_{k-1}, \hat{\mathbf{p}}_k)$ | Estimated positions $(\hat{\phi}_k, \hat{\lambda}_k)$ during outage | **YES** | **NO** | Directly computed along dead-reckoning trajectory | Directly computed along estimated trajectory |
| **Final Position Error ($m$)** | $\text{haversine}(\hat{\mathbf{p}}_{\text{out\_end}}, \mathbf{p}_{\text{out\_end}}^{\text{ref}})$ | Estimated position $\hat{\mathbf{p}}_{\text{end}}$, Reference position $\mathbf{p}_{\text{end}}^{\text{ref}}$ | **NO** | **YES** | Requires post-drive survey marker or external RTK GNSS logger | Measured against known reference trajectory |
| **Maximum Position Error ($m$)** | $\max_{k \in \text{outage}} \text{haversine}(\hat{\mathbf{p}}_k, \mathbf{p}_k^{\text{ref}})$ | Estimated positions $\hat{\mathbf{p}}_k$, Reference trajectory $\mathbf{p}_k^{\text{ref}}$ | **NO** | **YES** | Requires continuous external RTK / optical reference | Measured at every timestep against ground truth |
| **Drift Percentage ($\%$)** | $\frac{\text{Final Position Error}}{\text{Distance Travelled}} \times 100\%$ | Final position error, cumulative DR distance | **NO** | **YES** | Unobservable unless exit ground truth fix is known | Computed from reference error divided by distance |
| **Recovery Correction Jump ($m$)** | $\text{haversine}(\hat{\mathbf{p}}_{\text{out\_end}}, \mathbf{p}_{\text{GNSS\_rec}})$ | Pre-recovery DR position, First valid recovered GNSS fix | **YES** | **NO** | Measured at the recovery instant when satellite lock returns | Measured between dead-reckoned state and first recovery fix |
| **Velocity RMSE ($m/s$)** | $\sqrt{\frac{1}{N}\sum (\hat{v}_k - v_k^{\text{ref}})^2}$ | Estimated speed $\hat{v}_k$, Reference speed $v_k^{\text{ref}}$ | **NO** | **YES** | Requires external wheel speed / calibrated CAN bus logger | Measured against reference speed profile |
| **Mean / Max Heading Error ($^\circ$)** | $\min(\lvert\hat{\psi}_k - \psi_k^{\text{ref}}\rvert, 360^\circ - \lvert\hat{\psi}_k - \psi_k^{\text{ref}}\rvert)$ | Estimated heading $\hat{\psi}_k$, Reference heading $\psi_k^{\text{ref}}$ | **NO** | **YES** | Requires dual-antenna RTK heading / road survey reference | Measured against ground truth heading |

---

## 2. Mathematical Formulations

### 2.1 Geodesic Distance (Haversine Formula)
$$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
$$d = R_{\text{earth}} \cdot \Delta\sigma \quad (R_{\text{earth}} = 6,371,000\text{ m})$$

### 2.2 Shortest Angular Heading Difference
$$\delta\psi = \lvert\hat{\psi} - \psi^{\text{ref}}\rvert \pmod{360^\circ}$$
$$\Delta\psi = \min(\delta\psi, 360^\circ - \delta\psi)$$

### 2.3 Recovery Correction Jump
When GNSS reacquisition occurs at $t_{\text{rec}}$:
$$\Delta_{\text{jump}} = \text{haversine}\left(\hat{\mathbf{p}}(t_{\text{out\_end}}), \mathbf{p}_{\text{GNSS}}(t_{\text{rec}})\right)$$
*Note: This measures the spatial correction jump between the dead-reckoned exit position and the newly acquired satellite fix, distinguishing filter innovation from step displacement.*

---

## 3. Real Field Test vs. Synthetic Testing Rules

### Rule 1: No Phantom Metrics
If a real smartphone session is exported from `/app/history` where GNSS was denied during a tunnel drive and no external reference was recorded:
- `final_position_error_meters` $\to$ **`UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH`**
- `maximum_position_error_meters` $\to$ **`UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH`**
- `drift_percentage` $\to$ **`UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH`**
- `velocity_rmse_mps` $\to$ **`UNOBSERVABLE (NO SPEED REFERENCE)`**
- `mean_heading_error_deg` $\to$ **`UNOBSERVABLE (NO HEADING REFERENCE)`**

The offline analyzer will **never** default unobservable metrics to `0.0` or report `0.0% drift`.

### Rule 2: Synthetic Fixture Disclosure
Any benchmark table displaying numerical errors (such as $4.83\text{ m}$, $1.67\%$, $0.00\text{ m/s}$, $0.00^\circ$) must be explicitly flagged as:
```
LABEL: SYNTHETIC_TEST_FIXTURE (Deterministic Reference Trajectory)
NOT REAL FIELD TEST ACCURACY
```

---

## 4. Summary of Offline Tool Capabilities

The updated offline tool (`tools/offline_trajectory_analyzer.py`):
1. **Validates & Cleans:** Handles empty logs, 1-sample logs, duplicate timestamps, out-of-order records, and NaNs.
2. **Evaluates Outages:** Segments multi-outage logs and measures exact duration, travelled distance, and recovery jumps.
3. **Applies Ground Truth:** Only computes position error, velocity RMSE, and heading error when explicit reference fields (`ref_lat`, `ref_lon`, `ref_speed`, `ref_heading`) exist.
4. **Outputs Clean Reports:** Renders formatted terminal outputs and structured JSON suitable for CI/CD and field validation audits.

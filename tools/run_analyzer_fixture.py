"""
Test runner for Offline Analyzer with SYNTHETIC_TEST_FIXTURE
Cross-checks analyzer metrics independently.
LABEL: SYNTHETIC_TEST_FIXTURE (Not Real Field Data)
"""
import math
from tools.offline_trajectory_analyzer import TrajectoryAnalyzer, haversine_distance


def generate_synthetic_test_fixture():
    # 50-second synthetic driving trajectory:
    # 0s - 10s: GNSS Available, speed 10 m/s East (100m)
    # 10s - 40s: GNSS Outage (30s duration), speed 10 m/s East (300m travelled)
    #            Estimated drift: +5m lateral North offset at end
    # 40s - 50s: GNSS Recovery, returning fix at ground truth position
    records = []
    start_lat, start_lon = 28.6139, 77.2090
    cur_lat, cur_lon = start_lat, start_lon
    
    for t in range(51):
        is_outage = (10 <= t < 40)
        # 10 m/s East = ~0.0001024 degrees lon per second
        cur_lon += 10.0 / (111319.5 * math.cos(math.radians(28.6139)))
        
        # In outage, simulate a 5.0 meter lateral North drift
        est_lat = cur_lat
        if is_outage:
            drift_progress = (t - 10) / 30.0
            est_lat += (5.0 * drift_progress) / 111319.5
        
        rec = {
            "timestamp": float(t),
            "est_lat": est_lat,
            "est_lon": cur_lon,
            "ref_lat": cur_lat,  # ground truth reference
            "ref_lon": cur_lon,
            "raw_gnss_lat": cur_lat if not is_outage else None,
            "raw_gnss_lon": cur_lon if not is_outage else None,
            "speed": 10.0,
            "heading": 90.0,
            "ref_speed": 10.0,
            "ref_heading": 90.0,
            "is_gnss_available": not is_outage,
            "mode": "DEAD_RECKONING" if is_outage else "GNSS_AIDED"
        }
        records.append(rec)
    return records


def run_cross_check():
    records = generate_synthetic_test_fixture()
    analyzer = TrajectoryAnalyzer()
    res = analyzer.analyze_session(records)
    
    assert res["status"] == "SUCCESS"
    assert res["total_outages_detected"] == 1
    
    outage = res["outages"][0]
    duration = outage["duration_seconds"]
    distance = outage["distance_travelled_meters"]
    final_err = outage["final_position_error_meters"]
    drift_pct = outage["drift_percentage"]
    rec_jump = outage["recovery_jump_meters"]
    
    print("=== SYNTHETIC_TEST_FIXTURE ANALYSIS RESULTS ===")
    print(f"Outage Duration: {duration} s (Expected: 29.0 s)")
    print(f"Distance Travelled during Outage: {distance:.2f} m (Expected: ~289.72 m)")
    print(f"Final Position Error: {final_err:.2f} m (Expected: ~4.83 m)")
    print(f"Calculated Drift %: {drift_pct:.2f}% (Expected: ~1.67%)")
    print(f"Recovery Jump: {rec_jump:.2f} m (Expected: ~11.09 m spatial step to recovery fix)")
    print(f"Velocity RMSE: {outage['velocity_rmse_mps']:.2f} m/s (Expected: 0.00 m/s)")
    print(f"Heading Error: {outage['mean_heading_error_deg']:.2f} deg (Expected: 0.00 deg)")
    
    # Independent mathematical verification (29 discrete 1s intervals from t=10 to t=39)
    expected_dist = 289.72
    expected_err = 4.83
    expected_drift_pct = (expected_err / expected_dist) * 100.0
    expected_jump = math.sqrt(10.0**2 + expected_err**2)  # 10m East forward motion + 4.83m North drift = 11.09m
    
    assert abs(distance - expected_dist) < 1.0, f"Distance mismatch: {distance} vs {expected_dist}"
    assert abs(final_err - expected_err) < 0.2, f"Error mismatch: {final_err} vs {expected_err}"
    assert abs(drift_pct - expected_drift_pct) < 0.1, f"Drift % mismatch: {drift_pct} vs {expected_drift_pct}"
    assert abs(rec_jump - expected_jump) < 0.2, f"Recovery jump mismatch: {rec_jump} vs {expected_jump}"
    
    print("=== INDEPENDENT MATHEMATICAL CROSS-CHECK PASSED ===")
    return res


if __name__ == "__main__":
    run_cross_check()

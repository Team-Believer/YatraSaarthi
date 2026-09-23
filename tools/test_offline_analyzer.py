"""
Unit & Methodology Tests for Offline Trajectory Analyzer Tool

Validates mathematical correctness across all operating modes:
1. Normal GNSS coverage throughout (no outage)
2. Real-world GNSS-denied outage with NO independent reference (unobservable errors)
3. Synthetic / RTK ground truth reference trajectory (true position error & drift)
4. Recovery jump calculation (discrepancy at recovery fix)
5. Multiple sequential outages
6. Velocity RMSE evaluation vs reference
7. Heading error evaluation with 360-degree angular wrap
8. Full suite of input corruption edge-cases (empty, 1-sample, out-of-order, duplicate, NaN, etc.)
"""
import math
import pytest
from tools.offline_trajectory_analyzer import TrajectoryAnalyzer, haversine_distance, angular_diff_deg


def test_no_outage_continuous_gnss():
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.6139, "longitude": 77.2090, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        {"timestamp": 1.0, "latitude": 28.6140, "longitude": 77.2090, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        {"timestamp": 2.0, "latitude": 28.6141, "longitude": 77.2090, "is_gnss_available": True, "mode": "GNSS_AIDED"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_outages_detected"] == 0
    assert res["total_records_processed"] == 3


def test_real_world_outage_without_reference_must_report_unobservable():
    """
    CRITICAL TEST: In a real-world GNSS outage without an external RTK reference,
    error and drift must be reported as None (unobservable) and NOT 0.0 or fabricated numbers.
    """
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.6139, "longitude": 77.2090, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        # Outage: Real phone loses GNSS, no ground truth reference exists
        {"timestamp": 1.0, "latitude": 28.6140, "longitude": 77.2090, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 2.0, "latitude": 28.6141, "longitude": 77.2090, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 3.0, "latitude": 28.6142, "longitude": 77.2090, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        # Recovery
        {"timestamp": 4.0, "latitude": 28.6143, "longitude": 77.2090, "is_gnss_available": True, "mode": "GNSS_AIDED"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_outages_detected"] == 1
    
    outage = res["outages"][0]
    assert outage["duration_seconds"] == 2.0
    assert outage["distance_travelled_meters"] > 0.0
    assert outage["has_ground_truth_reference"] is False
    assert outage["final_position_error_meters"] is None  # MUST NOT BE 0.0
    assert outage["maximum_position_error_meters"] is None
    assert outage["drift_percentage"] is None             # MUST NOT BE 0.0%


def test_known_reference_trajectory_calculates_true_error_and_drift():
    """
    When an independent ground truth reference is provided, the analyzer computes
    exact position error, max error, and drift percentage.
    """
    analyzer = TrajectoryAnalyzer()
    # Baseline: Travel North at ~11.13 m/s (~0.0001 deg lat / s)
    # Estimate drifts East by ~0.00005 deg lon (~4.83 m)
    records = [
        {"timestamp": 0.0, "latitude": 28.6100, "longitude": 77.2000, "ref_lat": 28.6100, "ref_lon": 77.2000, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        # Outage starts
        {"timestamp": 1.0, "latitude": 28.6110, "longitude": 77.2000, "ref_lat": 28.6110, "ref_lon": 77.2000, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 2.0, "latitude": 28.6120, "longitude": 77.20005, "ref_lat": 28.6120, "ref_lon": 77.2000, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        # Recovery
        {"timestamp": 3.0, "latitude": 28.6130, "longitude": 77.2000, "ref_lat": 28.6130, "ref_lon": 77.2000, "is_gnss_available": True, "mode": "GNSS_AIDED"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_outages_detected"] == 1
    
    outage = res["outages"][0]
    assert outage["has_ground_truth_reference"] is True
    assert outage["final_position_error_meters"] is not None
    assert outage["final_position_error_meters"] > 4.0
    assert outage["maximum_position_error_meters"] is not None
    assert outage["drift_percentage"] is not None
    assert outage["drift_percentage"] > 0.0


def test_recovery_correction_jump():
    """
    Verifies that the recovery jump correctly measures the discrepancy between the
    dead-reckoned position at outage exit and the first recovered GNSS fix.
    """
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.6100, "longitude": 77.2000, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        # Outage
        {"timestamp": 1.0, "latitude": 28.6110, "longitude": 77.2000, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 2.0, "latitude": 28.6120, "longitude": 77.2005, "is_gnss_available": False, "mode": "DEAD_RECKONING"}, # DR drifted to lon 77.2005 (~48m)
        # Recovery with true raw GNSS fix at lon 77.2000
        {"timestamp": 3.0, "latitude": 28.6130, "longitude": 77.2000, "raw_gnss_lat": 28.6130, "raw_gnss_lon": 77.2000, "is_gnss_available": True, "mode": "GNSS_AIDED"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    outage = res["outages"][0]
    # Discrepancy between (28.6120, 77.2005) and (28.6130, 77.2000) is > 100m
    assert outage["recovery_jump_meters"] is not None
    assert outage["recovery_jump_meters"] > 100.0


def test_multiple_outages_independent_evaluation():
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.61, "longitude": 77.20, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        # Outage 1 (with reference)
        {"timestamp": 1.0, "latitude": 28.611, "longitude": 77.20, "ref_lat": 28.611, "ref_lon": 77.20, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 2.0, "latitude": 28.612, "longitude": 77.20, "ref_lat": 28.612, "ref_lon": 77.20, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        # Recovery 1
        {"timestamp": 3.0, "latitude": 28.613, "longitude": 77.20, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        # Outage 2 (WITHOUT reference)
        {"timestamp": 4.0, "latitude": 28.614, "longitude": 77.20, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 5.0, "latitude": 28.615, "longitude": 77.20, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        # Recovery 2
        {"timestamp": 6.0, "latitude": 28.616, "longitude": 77.20, "is_gnss_available": True, "mode": "GNSS_AIDED"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_outages_detected"] == 2
    assert res["outages"][0]["has_ground_truth_reference"] is True
    assert res["outages"][1]["has_ground_truth_reference"] is False
    assert res["outages"][1]["final_position_error_meters"] is None


def test_velocity_and_heading_evaluation_vs_reference():
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.61, "longitude": 77.20, "speed": 10.0, "heading": 90.0, "is_gnss_available": True, "mode": "GNSS_AIDED"},
        # Outage with known speed and heading reference:
        # speed = 10.0 vs ref = 12.0 (error = -2 m/s)
        # heading = 5.0 deg vs ref = 355.0 deg (wrap-around error = 10.0 deg)
        {"timestamp": 1.0, "latitude": 28.611, "longitude": 77.20, "speed": 10.0, "heading": 5.0, "ref_speed": 12.0, "ref_heading": 355.0, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 2.0, "latitude": 28.612, "longitude": 77.20, "speed": 10.0, "heading": 5.0, "ref_speed": 12.0, "ref_heading": 355.0, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        # Recovery
        {"timestamp": 3.0, "latitude": 28.613, "longitude": 77.20, "is_gnss_available": True, "mode": "GNSS_AIDED"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    outage = res["outages"][0]
    assert abs(outage["velocity_rmse_mps"] - 2.0) < 1e-4
    assert abs(outage["mean_heading_error_deg"] - 10.0) < 1e-4
    assert abs(outage["max_heading_error_deg"] - 10.0) < 1e-4


def test_angular_diff_wrap_around():
    assert angular_diff_deg(10.0, 350.0) == 20.0
    assert angular_diff_deg(350.0, 10.0) == 20.0
    assert angular_diff_deg(0.0, 180.0) == 180.0
    assert angular_diff_deg(90.0, 95.0) == 5.0


def test_edge_case_empty_log():
    analyzer = TrajectoryAnalyzer()
    res = analyzer.analyze_session([])
    assert res["status"] == "FAILED"


def test_edge_case_one_sample_log():
    analyzer = TrajectoryAnalyzer()
    res = analyzer.analyze_session([{"timestamp": 100.0, "latitude": 28.61, "longitude": 77.20}])
    assert res["status"] == "INSUFFICIENT_DATA"


def test_edge_case_out_of_order_and_duplicate():
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 2.0, "latitude": 28.6142, "longitude": 77.2090, "is_gnss_available": True},
        {"timestamp": 0.0, "latitude": 28.6139, "longitude": 77.2090, "is_gnss_available": True},
        {"timestamp": 0.0, "latitude": 28.6139, "longitude": 77.2090, "is_gnss_available": True}, # duplicate
        {"timestamp": 1.0, "latitude": 28.6140, "longitude": 77.2090, "is_gnss_available": True},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_records_processed"] == 3
    assert res["total_duration_seconds"] == 2.0


def test_edge_case_nan_and_out_of_bounds():
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.6139, "longitude": 77.2090, "is_gnss_available": True},
        {"timestamp": 1.0, "latitude": float('nan'), "longitude": 77.2090, "is_gnss_available": True},
        {"timestamp": 2.0, "latitude": 999.0, "longitude": 77.2090, "is_gnss_available": True},
        {"timestamp": 3.0, "latitude": 28.6141, "longitude": 77.2090, "is_gnss_available": True},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_records_processed"] == 2


def test_edge_case_outage_at_file_boundary():
    analyzer = TrajectoryAnalyzer()
    records = [
        {"timestamp": 0.0, "latitude": 28.6139, "longitude": 77.2090, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 1.0, "latitude": 28.6140, "longitude": 77.2090, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
        {"timestamp": 2.0, "latitude": 28.6141, "longitude": 77.2090, "is_gnss_available": False, "mode": "DEAD_RECKONING"},
    ]
    res = analyzer.analyze_session(records)
    assert res["status"] == "SUCCESS"
    assert res["total_outages_detected"] == 1
    assert res["outages"][0]["duration_seconds"] == 2.0
    assert res["outages"][0]["recovery_jump_meters"] is None

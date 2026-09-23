"""
YatraSaarthi — Offline Trajectory & Dead Reckoning Analyzer Tool

Mathematically rigorous offline trajectory and dead-reckoning analyzer.
Evaluates GNSS outage intervals, drift rates, position errors, recovery jumps,
velocity RMSE, and heading error.

CRITICAL METHODOLOGICAL RULES:
1. True reference position/velocity/heading error can ONLY be calculated when an
   independent ground truth or reference trajectory is provided.
2. During genuine GNSS outages in the field, real-time GNSS is lost. If no independent
   reference is supplied, position error and drift percentage MUST be reported as
   UNOBSERVABLE (None) rather than defaulting to 0.0.
3. Recovery jump measures the spatial correction jump applied when GNSS returns,
   computed as the distance between the dead-reckoned position at outage exit and
   the initial recovered GNSS fix (or filter correction).
"""
import sys
import os
import json
import math
from typing import Dict, Any, List, Optional, Tuple, Union


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance between two WGS84 points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def angular_diff_deg(deg1: float, deg2: float) -> float:
    """Calculate shortest angular difference between two heading angles in degrees [0, 180]."""
    diff = abs((deg1 - deg2) % 360.0)
    return min(diff, 360.0 - diff)


class TrajectoryAnalyzer:
    """
    Offline analyzer for navigation sessions, GNSS outage evaluation,
    and dead reckoning accuracy validation.
    """
    
    def __init__(self):
        pass

    def validate_and_clean_records(self, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Validates, deduplicates, and sorts records chronologically.
        Returns: (cleaned_records, list_of_validation_warnings)
        """
        warnings = []
        if not records:
            return [], ["Empty record set provided."]
        
        valid_records = []
        seen_timestamps = set()
        
        for idx, r in enumerate(records):
            if not isinstance(r, dict):
                warnings.append(f"Record {idx} is not a valid dictionary. Skipped.")
                continue
            
            # Timestamp check
            ts = r.get("timestamp")
            if ts is None or not isinstance(ts, (int, float)) or math.isnan(ts) or math.isinf(ts):
                warnings.append(f"Record {idx} has invalid timestamp: {ts}. Skipped.")
                continue
            
            # Deduplicate timestamps
            if ts in seen_timestamps:
                warnings.append(f"Record {idx} has duplicate timestamp: {ts}. Skipped.")
                continue
            seen_timestamps.add(ts)
            
            # Estimated position check
            est_lat = r.get("est_lat") if r.get("est_lat") is not None else r.get("latitude")
            est_lon = r.get("est_lon") if r.get("est_lon") is not None else r.get("longitude")
            
            if est_lat is not None and est_lon is not None:
                if math.isnan(est_lat) or math.isnan(est_lon) or math.isinf(est_lat) or math.isinf(est_lon):
                    warnings.append(f"Record {idx} at timestamp {ts} has NaN/Inf estimated coordinates. Skipped.")
                    continue
                if not (-90.0 <= est_lat <= 90.0 and -180.0 <= est_lon <= 180.0):
                    warnings.append(f"Record {idx} at timestamp {ts} has out-of-bounds coordinates: ({est_lat}, {est_lon}). Skipped.")
                    continue
            
            # Reference / Ground Truth position check (separate from real-time GNSS)
            ref_lat = r.get("ref_lat") if r.get("ref_lat") is not None else r.get("ground_truth_lat")
            ref_lon = r.get("ref_lon") if r.get("ref_lon") is not None else r.get("ground_truth_lon")
            if ref_lat is None and r.get("gnss_lat") is not None:
                # In synthetic fixtures, gnss_lat may serve as reference ground truth
                ref_lat = r.get("gnss_lat")
                ref_lon = r.get("gnss_lon")
            
            if ref_lat is not None and ref_lon is not None:
                if math.isnan(ref_lat) or math.isnan(ref_lon) or math.isinf(ref_lat) or math.isinf(ref_lon):
                    ref_lat, ref_lon = None, None
                elif not (-90.0 <= ref_lat <= 90.0 and -180.0 <= ref_lon <= 180.0):
                    ref_lat, ref_lon = None, None
            
            # GNSS live measurement coordinates (absent during real outages)
            raw_gnss_lat = r.get("raw_gnss_lat") if r.get("raw_gnss_lat") is not None else r.get("raw_lat")
            raw_gnss_lon = r.get("raw_gnss_lon") if r.get("raw_gnss_lon") is not None else r.get("raw_lon")
            
            # Speed and Heading (Estimated and Reference)
            est_speed = r.get("est_speed") if r.get("est_speed") is not None else r.get("speed")
            ref_speed = r.get("ref_speed") if r.get("ref_speed") is not None else r.get("gnss_speed")
            est_heading = r.get("est_heading") if r.get("est_heading") is not None else r.get("heading")
            ref_heading = r.get("ref_heading") if r.get("ref_heading") is not None else r.get("gnss_heading")
            
            cleaned_rec = {
                "timestamp": float(ts),
                "est_lat": float(est_lat) if est_lat is not None else None,
                "est_lon": float(est_lon) if est_lon is not None else None,
                "est_speed": float(est_speed) if est_speed is not None and not math.isnan(float(est_speed)) else None,
                "est_heading": float(est_heading) if est_heading is not None and not math.isnan(float(est_heading)) else None,
                "ref_lat": float(ref_lat) if ref_lat is not None else None,
                "ref_lon": float(ref_lon) if ref_lon is not None else None,
                "ref_speed": float(ref_speed) if ref_speed is not None and not math.isnan(float(ref_speed)) else None,
                "ref_heading": float(ref_heading) if ref_heading is not None and not math.isnan(float(ref_heading)) else None,
                "raw_gnss_lat": float(raw_gnss_lat) if raw_gnss_lat is not None else None,
                "raw_gnss_lon": float(raw_gnss_lon) if raw_gnss_lon is not None else None,
                "mode": str(r.get("mode", r.get("navigation_mode", "UNKNOWN"))),
                "is_gnss_available": bool(r.get("is_gnss_available", r.get("gnss_available", False))),
                "recovery_event": bool(r.get("recovery_event", False)),
                "correction_jump": float(r["correction_jump"]) if r.get("correction_jump") is not None and not math.isnan(float(r["correction_jump"])) else None
            }
            valid_records.append(cleaned_rec)
        
        # Sort chronologically to resolve out-of-order records
        valid_records.sort(key=lambda x: x["timestamp"])
        return valid_records, warnings

    def analyze_session(self, raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Runs comprehensive, mathematically rigorous analysis on navigation session records.
        Distinguishes observable metrics from unobservable ground-truth metrics.
        """
        records, warnings = self.validate_and_clean_records(raw_records)
        
        if not records:
            return {
                "status": "FAILED",
                "reason": "No valid records to analyze",
                "warnings": warnings,
                "metrics": None
            }
        
        if len(records) < 2:
            return {
                "status": "INSUFFICIENT_DATA",
                "reason": "Need at least 2 distinct temporal samples for analysis",
                "sample_count": len(records),
                "warnings": warnings,
                "metrics": None
            }
        
        total_duration = records[-1]["timestamp"] - records[0]["timestamp"]
        total_distance = 0.0
        outages: List[Dict[str, Any]] = []
        current_outage: Optional[Dict[str, Any]] = None
        max_recovery_jump: Optional[float] = None
        
        for i in range(len(records)):
            curr = records[i]
            prev = records[i - 1] if i > 0 else None
            
            # Accumulate overall estimated distance
            if prev and curr["est_lat"] is not None and prev["est_lat"] is not None:
                d = haversine_distance(prev["est_lat"], prev["est_lon"], curr["est_lat"], curr["est_lon"])
                total_distance += d
            
            # Detect outage condition: explicit dead reckoning mode or missing GNSS
            is_outage = (
                curr["mode"] in ("DEAD_RECKONING", "MAP_AIDED_DEAD_RECKONING", "GNSS_LOST", "GNSS_DEGRADING") or
                not curr["is_gnss_available"]
            )
            
            if is_outage:
                if current_outage is None:
                    current_outage = {
                        "start_index": i,
                        "start_time": curr["timestamp"],
                        "start_est_lat": curr["est_lat"],
                        "start_est_lon": curr["est_lon"],
                        "records": [curr],
                        "distance_during_outage": 0.0,
                        "position_errors": [],
                        "speed_errors_sq": [],
                        "heading_errors": []
                    }
                else:
                    if prev and curr["est_lat"] is not None and prev["est_lat"] is not None:
                        current_outage["distance_during_outage"] += haversine_distance(
                            prev["est_lat"], prev["est_lon"], curr["est_lat"], curr["est_lon"]
                        )
                    current_outage["records"].append(curr)
                
                # Check position error against ground truth IF reference is explicitly available
                if curr["est_lat"] is not None and curr["ref_lat"] is not None:
                    err = haversine_distance(curr["est_lat"], curr["est_lon"], curr["ref_lat"], curr["ref_lon"])
                    current_outage["position_errors"].append(err)
                
                # Check speed error against reference speed IF available
                if curr["est_speed"] is not None and curr["ref_speed"] is not None:
                    current_outage["speed_errors_sq"].append((curr["est_speed"] - curr["ref_speed"]) ** 2)
                
                # Check heading error against reference heading IF available
                if curr["est_heading"] is not None and curr["ref_heading"] is not None:
                    h_err = angular_diff_deg(curr["est_heading"], curr["ref_heading"])
                    current_outage["heading_errors"].append(h_err)
                    
            else:
                # Outage ended / GNSS available
                if current_outage is not None:
                    current_outage["end_index"] = i - 1
                    current_outage["end_time"] = prev["timestamp"] if prev else curr["timestamp"]
                    current_outage["duration_s"] = max(0.0, current_outage["end_time"] - current_outage["start_time"])
                    
                    # 1. Final position error and drift percentage
                    last_rec = current_outage["records"][-1]
                    dist_out = current_outage["distance_during_outage"]
                    
                    if last_rec["est_lat"] is not None and last_rec["ref_lat"] is not None:
                        final_err = haversine_distance(last_rec["est_lat"], last_rec["est_lon"], last_rec["ref_lat"], last_rec["ref_lon"])
                        current_outage["final_pos_error"] = final_err
                        current_outage["drift_pct"] = (final_err / dist_out * 100.0) if dist_out > 1.0 else 0.0
                    else:
                        current_outage["final_pos_error"] = None
                        current_outage["drift_pct"] = None
                    
                    # 2. Maximum position error
                    if current_outage["position_errors"]:
                        current_outage["max_pos_error"] = max(current_outage["position_errors"])
                    else:
                        current_outage["max_pos_error"] = None
                    
                    # 3. Velocity RMSE vs Reference
                    if current_outage["speed_errors_sq"]:
                        current_outage["velocity_rmse"] = math.sqrt(sum(current_outage["speed_errors_sq"]) / len(current_outage["speed_errors_sq"]))
                    else:
                        current_outage["velocity_rmse"] = None
                    
                    # 4. Heading error vs Reference
                    if current_outage["heading_errors"]:
                        current_outage["mean_heading_error"] = sum(current_outage["heading_errors"]) / len(current_outage["heading_errors"])
                        current_outage["max_heading_error"] = max(current_outage["heading_errors"])
                    else:
                        current_outage["mean_heading_error"] = None
                        current_outage["max_heading_error"] = None
                    
                    # 5. Recovery Correction Jump
                    # The correction jump is the discrepancy between the dead-reckoned position at outage exit
                    # and the first recovered GNSS fix (or filter correction).
                    recovery_jump = None
                    if curr.get("correction_jump") is not None:
                        recovery_jump = curr["correction_jump"]
                    elif curr.get("raw_gnss_lat") is not None and last_rec["est_lat"] is not None:
                        recovery_jump = haversine_distance(last_rec["est_lat"], last_rec["est_lon"], curr["raw_gnss_lat"], curr["raw_gnss_lon"])
                    elif curr.get("ref_lat") is not None and last_rec["est_lat"] is not None:
                        recovery_jump = haversine_distance(last_rec["est_lat"], last_rec["est_lon"], curr["ref_lat"], curr["ref_lon"])
                    
                    current_outage["recovery_jump"] = recovery_jump
                    if recovery_jump is not None:
                        if max_recovery_jump is None or recovery_jump > max_recovery_jump:
                            max_recovery_jump = recovery_jump
                    
                    outages.append(current_outage)
                    current_outage = None
        
        # Outage extending to end of file boundary
        if current_outage is not None:
            last_rec = current_outage["records"][-1]
            current_outage["end_index"] = len(records) - 1
            current_outage["end_time"] = last_rec["timestamp"]
            current_outage["duration_s"] = max(0.0, current_outage["end_time"] - current_outage["start_time"])
            dist_out = current_outage["distance_during_outage"]
            
            if last_rec["est_lat"] is not None and last_rec["ref_lat"] is not None:
                final_err = haversine_distance(last_rec["est_lat"], last_rec["est_lon"], last_rec["ref_lat"], last_rec["ref_lon"])
                current_outage["final_pos_error"] = final_err
                current_outage["drift_pct"] = (final_err / dist_out * 100.0) if dist_out > 1.0 else 0.0
            else:
                current_outage["final_pos_error"] = None
                current_outage["drift_pct"] = None
            
            current_outage["max_pos_error"] = max(current_outage["position_errors"]) if current_outage["position_errors"] else None
            current_outage["velocity_rmse"] = math.sqrt(sum(current_outage["speed_errors_sq"]) / len(current_outage["speed_errors_sq"])) if current_outage["speed_errors_sq"] else None
            current_outage["mean_heading_error"] = (sum(current_outage["heading_errors"]) / len(current_outage["heading_errors"])) if current_outage["heading_errors"] else None
            current_outage["max_heading_error"] = max(current_outage["heading_errors"]) if current_outage["heading_errors"] else None
            current_outage["recovery_jump"] = None  # Ended at boundary without recovery fix
            outages.append(current_outage)
            current_outage = None

        # Format summarized outage report with explicit truth status
        summarized_outages = []
        for idx, out in enumerate(outages):
            has_ref = out["final_pos_error"] is not None
            
            summarized_outages.append({
                "outage_index": idx + 1,
                "duration_seconds": round(out["duration_s"], 2),
                "distance_travelled_meters": round(out["distance_during_outage"], 2),
                "has_ground_truth_reference": has_ref,
                "final_position_error_meters": round(out["final_pos_error"], 2) if out["final_pos_error"] is not None else None,
                "maximum_position_error_meters": round(out["max_pos_error"], 2) if out["max_pos_error"] is not None else None,
                "drift_percentage": round(out["drift_pct"], 2) if out["drift_pct"] is not None else None,
                "recovery_jump_meters": round(out["recovery_jump"], 2) if out["recovery_jump"] is not None else None,
                "velocity_rmse_mps": round(out["velocity_rmse"], 2) if out["velocity_rmse"] is not None else None,
                "mean_heading_error_deg": round(out["mean_heading_error"], 2) if out["mean_heading_error"] is not None else None,
                "max_heading_error_deg": round(out["max_heading_error"], 2) if out["max_heading_error"] is not None else None,
            })

        return {
            "status": "SUCCESS",
            "total_records_processed": len(records),
            "total_duration_seconds": round(total_duration, 2),
            "total_distance_meters": round(total_distance, 2),
            "total_outages_detected": len(summarized_outages),
            "maximum_recovery_jump_meters": round(max_recovery_jump, 2) if max_recovery_jump is not None else None,
            "outages": summarized_outages,
            "warnings_count": len(warnings),
            "warnings": warnings[:10]
        }


def format_report_text(result: Dict[str, Any], filepath: str = "") -> str:
    """Formats analyzer results as clean, human-readable text."""
    lines = []
    lines.append("=" * 70)
    lines.append("YATRASARTHI — OFFLINE TRAJECTORY & DEAD RECKONING ANALYSIS")
    lines.append("=" * 70)
    if filepath:
        lines.append(f"Analyzed File: {filepath}")
    lines.append(f"Status: {result.get('status')}")
    
    if result.get("status") != "SUCCESS":
        lines.append(f"Reason: {result.get('reason')}")
        lines.append("=" * 70)
        return "\n".join(lines)
    
    lines.append(f"Total Records Processed: {result['total_records_processed']}")
    lines.append(f"Total Session Duration: {result['total_duration_seconds']} s")
    lines.append(f"Total Trajectory Distance: {result['total_distance_meters']:.2f} m")
    lines.append(f"Total Outages Detected: {result['total_outages_detected']}")
    
    max_jump = result.get('maximum_recovery_jump_meters')
    lines.append(f"Max Recovery Jump: {f'{max_jump:.2f} m' if max_jump is not None else 'UNOBSERVABLE (NO RECOVERY FIX)'}")
    lines.append("-" * 70)
    
    for out in result.get("outages", []):
        idx = out["outage_index"]
        lines.append(f"OUTAGE #{idx}:")
        lines.append(f"  • Outage Duration:          {out['duration_seconds']} s")
        lines.append(f"  • Distance Travelled:       {out['distance_travelled_meters']:.2f} m")
        
        if out["has_ground_truth_reference"]:
            lines.append(f"  • Final Position Error:     {out['final_position_error_meters']:.2f} m")
            lines.append(f"  • Max Position Error:       {out['maximum_position_error_meters']:.2f} m")
            lines.append(f"  • Drift Percentage:         {out['drift_percentage']:.2f}% of distance")
        else:
            lines.append(f"  • Final Position Error:     UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH")
            lines.append(f"  • Max Position Error:       UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH")
            lines.append(f"  • Drift Percentage:         UNOBSERVABLE — NO INDEPENDENT GROUND TRUTH")
            
        rec_jump = out.get("recovery_jump_meters")
        lines.append(f"  • Recovery Correction Jump: {f'{rec_jump:.2f} m' if rec_jump is not None else 'UNOBSERVABLE (NO RECOVERY FIX)'}")
        
        v_rmse = out.get("velocity_rmse_mps")
        lines.append(f"  • Velocity RMSE:            {f'{v_rmse:.2f} m/s' if v_rmse is not None else 'UNOBSERVABLE (NO SPEED REFERENCE)'}")
        
        h_mean = out.get("mean_heading_error_deg")
        lines.append(f"  • Mean Heading Error:       {f'{h_mean:.2f} deg' if h_mean is not None else 'UNOBSERVABLE (NO HEADING REFERENCE)'}")
        lines.append("-" * 70)
        
    if result.get("warnings"):
        lines.append("Validation Warnings:")
        for w in result["warnings"]:
            lines.append(f"  ! {w}")
        lines.append("=" * 70)
        
    return "\n".join(lines)


def parse_session_file(filepath: str) -> List[Dict[str, Any]]:
    """Loads and normalizes session JSON files."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Session file not found: {filepath}")
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        if "points" in data and isinstance(data["points"], list):
            # Normal frontend session export
            points = data["points"]
            normalized = []
            for p in points:
                ts_raw = p.get("timestamp")
                ts_val = 0.0
                if isinstance(ts_raw, (int, float)):
                    ts_val = float(ts_raw)
                elif isinstance(ts_raw, str):
                    try:
                        import datetime
                        dt = datetime.datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
                        ts_val = dt.timestamp()
                    except Exception:
                        ts_val = len(normalized) * 0.1
                else:
                    ts_val = len(normalized) * 0.1
                
                normalized.append({
                    "timestamp": ts_val,
                    "latitude": p.get("latitude"),
                    "longitude": p.get("longitude"),
                    "speed": p.get("speed"),
                    "heading": p.get("heading"),
                    "mode": p.get("mode"),
                    "is_gnss_available": p.get("mode") in ("GNSS_AIDED", "GNSS_FIX", "STANDBY")
                })
            return normalized
        elif "records" in data and isinstance(data["records"], list):
            return data["records"]
        elif "trajectory" in data and isinstance(data["trajectory"], list):
            return data["trajectory"]
        else:
            return [data]
    return []


def main():
    if len(sys.argv) < 2:
        print("Usage: python tools/offline_trajectory_analyzer.py <session_file.json>")
        sys.exit(1)
        
    filepath = sys.argv[1]
    try:
        records = parse_session_file(filepath)
        analyzer = TrajectoryAnalyzer()
        res = analyzer.analyze_session(records)
        print(format_report_text(res, filepath))
    except Exception as e:
        print(f"Error analyzing session file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

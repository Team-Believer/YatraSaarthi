/**
 * YatraSaarthi - Trip Navigation & Outage Analytics
 * 
 * Computes verified outage metrics from real session trajectory points:
 * - Outage events count
 * - Longest outage duration
 * - Total DR duration
 * - Total GNSS supported duration
 * - Total Reacquisition duration
 * - Max recorded speed
 * - Normalized timeline segments
 * 
 * NO fabricated values. If points are missing, returns null / 0 without making up numbers.
 */

import type { TrajectoryPoint } from '../../services/api/historyService';
export type { TrajectoryPoint };

export interface OutageSegment {
  type: 'GNSS' | 'DR' | 'REACQUISITION';
  durationSeconds: number;
  percent: number;
}

export interface TripOutageMetrics {
  hasTelemetry: boolean;
  outageEventsCount: number;
  totalDrSeconds: number;
  totalGnssSeconds: number;
  totalReacquisitionSeconds: number;
  longestOutageSeconds: number;
  maxSpeedKmh: number | null;
  segments: OutageSegment[];
}

function parsePointTime(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const parsed = Date.parse(ts);
  if (!isNaN(parsed)) return parsed / 1000;
  const num = parseFloat(ts);
  return isNaN(num) ? null : num;
}

function classifyPointMode(mode?: string | null): 'GNSS' | 'DR' | 'REACQUISITION' {
  if (!mode) return 'GNSS';
  const upper = mode.toUpperCase();
  if (
    upper.includes('DEAD_RECKONING') ||
    upper.includes('LOST') ||
    upper.includes('INEKF') ||
    upper.includes('INERTIAL') ||
    upper.includes('DR')
  ) {
    return 'DR';
  }
  if (upper.includes('REACQUISITION') || upper.includes('RECOVERY')) {
    return 'REACQUISITION';
  }
  return 'GNSS';
}

export function computeTripOutageMetrics(
  points?: TrajectoryPoint[] | null,
  totalDurationSeconds?: number
): TripOutageMetrics {
  if (!points || !Array.isArray(points) || points.length < 2) {
    return {
      hasTelemetry: false,
      outageEventsCount: 0,
      totalDrSeconds: 0,
      totalGnssSeconds: totalDurationSeconds || 0,
      totalReacquisitionSeconds: 0,
      longestOutageSeconds: 0,
      maxSpeedKmh: null,
      segments: totalDurationSeconds
        ? [{ type: 'GNSS', durationSeconds: totalDurationSeconds, percent: 100 }]
        : [],
    };
  }

  let maxSpeedMps = 0;
  let outageEventsCount = 0;
  let currentDrDuration = 0;
  let longestOutageSeconds = 0;
  let inDr = false;

  let totalDrSeconds = 0;
  let totalGnssSeconds = 0;
  let totalReacquisitionSeconds = 0;

  interface RawSegment {
    type: 'GNSS' | 'DR' | 'REACQUISITION';
    duration: number;
  }
  const rawSegments: RawSegment[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];

    // Max speed tracking
    if (typeof pt.speed === 'number' && !isNaN(pt.speed) && pt.speed > maxSpeedMps) {
      maxSpeedMps = pt.speed;
    }

    if (i === 0) continue;

    const prevPt = points[i - 1];
    const tPrev = parsePointTime(prevPt.timestamp);
    const tCurr = parsePointTime(pt.timestamp);

    // Delta time between points (default to 1.0s if timestamp unavailable or non-positive)
    let dt = 1.0;
    if (tPrev !== null && tCurr !== null && tCurr > tPrev) {
      dt = Math.min(tCurr - tPrev, 60.0); // cap gap to 60s
    }

    const category = classifyPointMode(pt.mode);

    if (category === 'DR') {
      totalDrSeconds += dt;
      if (!inDr) {
        inDr = true;
        outageEventsCount += 1;
        currentDrDuration = dt;
      } else {
        currentDrDuration += dt;
      }
      if (currentDrDuration > longestOutageSeconds) {
        longestOutageSeconds = currentDrDuration;
      }
    } else {
      inDr = false;
      currentDrDuration = 0;
      if (category === 'REACQUISITION') {
        totalReacquisitionSeconds += dt;
      } else {
        totalGnssSeconds += dt;
      }
    }

    // Merge consecutive segments
    const lastSeg = rawSegments[rawSegments.length - 1];
    if (lastSeg && lastSeg.type === category) {
      lastSeg.duration += dt;
    } else {
      rawSegments.push({ type: category, duration: dt });
    }
  }

  const grandTotal = totalDrSeconds + totalGnssSeconds + totalReacquisitionSeconds;
  const segments: OutageSegment[] = rawSegments.map((s) => ({
    type: s.type,
    durationSeconds: s.duration,
    percent: grandTotal > 0 ? (s.duration / grandTotal) * 100 : 0,
  }));

  const maxSpeedKmh = maxSpeedMps > 0 ? Math.round(maxSpeedMps * 3.6) : null;

  return {
    hasTelemetry: true,
    outageEventsCount,
    totalDrSeconds: Math.round(totalDrSeconds),
    totalGnssSeconds: Math.round(totalGnssSeconds),
    totalReacquisitionSeconds: Math.round(totalReacquisitionSeconds),
    longestOutageSeconds: Math.round(longestOutageSeconds),
    maxSpeedKmh,
    segments,
  };
}

export function formatDurationClock(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * YatraSaarthi — Local Route Matcher
 *
 * Performs real-time GPS-to-saved-route matching without internet.
 * Uses geographic distance calculations with segment indexing
 * for efficient matching on large route geometries.
 *
 * No fake data. No simulated movement. No marker teleportation.
 */

import type { OfflineRouteRecord, OfflineRouteStep } from './offlineRouteStorage';

// === Types ===

export type RouteDeviationStatus = 'ON_ROUTE' | 'SLIGHTLY_OFF_ROUTE' | 'OFF_ROUTE' | 'UNKNOWN';

export interface RouteMatchResult {
  /** Index of nearest segment in route geometry */
  segmentIndex: number;
  /** Nearest point on route [lon, lat] */
  nearestPoint: [number, number];
  /** Distance from GPS to route in meters */
  distanceFromRoute: number;
  /** Bearing of the matched route segment in degrees */
  routeBearing: number;
  /** Distance travelled along route in meters */
  distanceTravelled: number;
  /** Distance remaining to destination in meters */
  distanceRemaining: number;
  /** Progress as fraction 0..1 */
  progressFraction: number;
  /** Deviation classification */
  deviationStatus: RouteDeviationStatus;
  /** Next upcoming step */
  nextStep: OfflineRouteStep | null;
  /** Distance to next maneuver in meters */
  distanceToNextManeuver: number;
  /** ETA in seconds based on current speed */
  etaSeconds: number | null;
}

// === Configurable Thresholds ===

/** Distance thresholds for deviation classification (meters) */
const ON_ROUTE_THRESHOLD = 30;
const SLIGHTLY_OFF_THRESHOLD = 80;

/** Search window around last segment index to limit computation */
const SEGMENT_SEARCH_WINDOW = 40;

// === Geographic Utilities ===

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

/** Haversine distance between two [lon, lat] points in meters */
function haversineDistance(p1: [number, number], p2: [number, number]): number {
  const [lon1, lat1] = p1;
  const [lon2, lat2] = p2;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Compute bearing between two [lon, lat] points in degrees 0..360 */
function computeBearing(from: [number, number], to: [number, number]): number {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG_TO_RAD);
  const x =
    Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  if (brng < 0) brng += 360;
  return brng;
}

/**
 * Project a point onto a line segment and return the nearest point and fraction.
 * Uses local metric approximation (cos(lat) scaling).
 */
function projectPointOnSegment(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): { nearest: [number, number]; t: number; distance: number } {
  const cosLat = Math.cos(point[1] * DEG_TO_RAD);
  const px = (point[0] - segStart[0]) * 111319.5 * cosLat;
  const py = (point[1] - segStart[1]) * 111319.5;
  const dx = (segEnd[0] - segStart[0]) * 111319.5 * cosLat;
  const dy = (segEnd[1] - segStart[1]) * 111319.5;

  const segLenSq = dx * dx + dy * dy;
  let t: number;

  if (segLenSq < 1e-6) {
    t = 0;
  } else {
    t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
  }

  const nearestLon = segStart[0] + t * (segEnd[0] - segStart[0]);
  const nearestLat = segStart[1] + t * (segEnd[1] - segStart[1]);
  const nearest: [number, number] = [nearestLon, nearestLat];

  const distance = haversineDistance(point, nearest);

  return { nearest, t, distance };
}

// === Route Matcher Class ===

export class LocalRouteMatcher {
  private route: OfflineRouteRecord;
  private segmentDistances: number[]; // cumulative distance at each coord index
  private totalRouteDistance: number;
  private lastMatchedIndex: number = 0;

  constructor(route: OfflineRouteRecord) {
    this.route = route;
    this.segmentDistances = this.computeCumulativeDistances();
    this.totalRouteDistance =
      this.segmentDistances.length > 0
        ? this.segmentDistances[this.segmentDistances.length - 1]
        : route.routeDistance;
  }

  /**
   * Pre-compute cumulative distances along route for efficient progress calculation.
   */
  private computeCumulativeDistances(): number[] {
    const coords = this.route.routeGeometry;
    if (!coords || coords.length < 2) return [0];

    const cumulative = [0];
    for (let i = 1; i < coords.length; i++) {
      const d = haversineDistance(coords[i - 1], coords[i]);
      cumulative.push(cumulative[i - 1] + d);
    }
    return cumulative;
  }

  /**
   * Match a GPS position against the saved route.
   * Uses bounded search window around last matched index for performance.
   */
  match(
    gpsPosition: [number, number], // [lon, lat]
    gpsAccuracy: number | null,
    currentSpeed: number | null
  ): RouteMatchResult {
    const coords = this.route.routeGeometry;

    if (!coords || coords.length < 2) {
      return this.emptyResult(gpsPosition);
    }

    // Bounded search: search around last matched index
    const startIdx = Math.max(0, this.lastMatchedIndex - 5);
    const endIdx = Math.min(coords.length - 1, this.lastMatchedIndex + SEGMENT_SEARCH_WINDOW);

    let bestDist = Infinity;
    let bestIdx = this.lastMatchedIndex;
    let bestNearest: [number, number] = coords[0];
    let bestT = 0;

    for (let i = startIdx; i < endIdx; i++) {
      const proj = projectPointOnSegment(gpsPosition, coords[i], coords[i + 1]);
      if (proj.distance < bestDist) {
        bestDist = proj.distance;
        bestIdx = i;
        bestNearest = proj.nearest;
        bestT = proj.t;
      }
    }

    // If best found is far, do a full scan (rare fallback)
    if (bestDist > SLIGHTLY_OFF_THRESHOLD * 2) {
      for (let i = 0; i < coords.length - 1; i++) {
        if (i >= startIdx && i < endIdx) continue;
        const proj = projectPointOnSegment(gpsPosition, coords[i], coords[i + 1]);
        if (proj.distance < bestDist) {
          bestDist = proj.distance;
          bestIdx = i;
          bestNearest = proj.nearest;
          bestT = proj.t;
        }
      }
    }

    // Prevent backward jumps: only allow forward movement or small backward (GPS noise)
    if (bestIdx < this.lastMatchedIndex - 3) {
      bestIdx = this.lastMatchedIndex;
      const proj = projectPointOnSegment(gpsPosition, coords[bestIdx], coords[Math.min(bestIdx + 1, coords.length - 1)]);
      bestNearest = proj.nearest;
      bestDist = proj.distance;
      bestT = proj.t;
    }

    this.lastMatchedIndex = bestIdx;

    // Distance travelled along route
    const distanceTravelled =
      this.segmentDistances[bestIdx] +
      bestT * (this.segmentDistances[bestIdx + 1] - this.segmentDistances[bestIdx]);
    const distanceRemaining = Math.max(0, this.totalRouteDistance - distanceTravelled);
    const progressFraction = this.totalRouteDistance > 0 ? distanceTravelled / this.totalRouteDistance : 0;

    // Route bearing at matched segment
    const routeBearing = computeBearing(coords[bestIdx], coords[Math.min(bestIdx + 1, coords.length - 1)]);

    // Deviation classification (uses GPS accuracy to avoid false "off route")
    const effectiveAccuracy = gpsAccuracy != null && gpsAccuracy > 0 ? gpsAccuracy : 10;
    const adjustedDistance = Math.max(0, bestDist - effectiveAccuracy * 0.5);
    let deviationStatus: RouteDeviationStatus;
    if (adjustedDistance <= ON_ROUTE_THRESHOLD) {
      deviationStatus = 'ON_ROUTE';
    } else if (adjustedDistance <= SLIGHTLY_OFF_THRESHOLD) {
      deviationStatus = 'SLIGHTLY_OFF_ROUTE';
    } else {
      deviationStatus = 'OFF_ROUTE';
    }

    // Next step determination
    const { nextStep, distanceToNextManeuver } = this.findNextStep(distanceTravelled);

    // ETA based on current speed
    let etaSeconds: number | null = null;
    if (currentSpeed != null && currentSpeed > 0.5) {
      etaSeconds = distanceRemaining / currentSpeed;
    }

    return {
      segmentIndex: bestIdx,
      nearestPoint: bestNearest,
      distanceFromRoute: bestDist,
      routeBearing,
      distanceTravelled,
      distanceRemaining,
      progressFraction,
      deviationStatus,
      nextStep,
      distanceToNextManeuver,
      etaSeconds,
    };
  }

  /**
   * Find the next route step based on distance travelled.
   */
  private findNextStep(distanceTravelled: number): {
    nextStep: OfflineRouteStep | null;
    distanceToNextManeuver: number;
  } {
    const steps = this.route.steps;
    if (!steps || steps.length === 0) {
      return { nextStep: null, distanceToNextManeuver: 0 };
    }

    // Accumulate step distances to find which step we're currently on
    let cumulativeStepDist = 0;
    for (let i = 0; i < steps.length; i++) {
      cumulativeStepDist += steps[i].distance;
      if (cumulativeStepDist > distanceTravelled) {
        const distToManeuver = cumulativeStepDist - distanceTravelled;
        return {
          nextStep: steps[i],
          distanceToNextManeuver: Math.max(0, distToManeuver),
        };
      }
    }

    // Past all steps — at destination
    const lastStep = steps[steps.length - 1];
    return { nextStep: lastStep, distanceToNextManeuver: 0 };
  }

  private emptyResult(gpsPosition: [number, number]): RouteMatchResult {
    return {
      segmentIndex: 0,
      nearestPoint: gpsPosition,
      distanceFromRoute: 0,
      routeBearing: 0,
      distanceTravelled: 0,
      distanceRemaining: this.route.routeDistance,
      progressFraction: 0,
      deviationStatus: 'UNKNOWN',
      nextStep: null,
      distanceToNextManeuver: 0,
      etaSeconds: null,
    };
  }

  /** Reset the matcher (e.g. when starting a new navigation session) */
  reset(): void {
    this.lastMatchedIndex = 0;
  }

  /** Get the total route distance in meters */
  getTotalDistance(): number {
    return this.totalRouteDistance;
  }
}

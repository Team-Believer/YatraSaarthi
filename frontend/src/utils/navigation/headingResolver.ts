/**
 * Centralized Heading Resolver Utility
 * 
 * Implements strict frontend priority:
 * 1. REAL InEKF/navigation heading when active telemetry is valid
 * 2. REAL device compass/orientation heading when available on device
 * 3. REAL geolocation course when vehicle is moving (speed > threshold)
 * 4. None / Unavailable (honest '—' fallback, never fake 0° N)
 */

export type HeadingSource = 'navigation' | 'compass' | 'course' | 'none';

export interface HeadingInput {
  isLive?: boolean;
  navigationHeading?: number | null;
  hasNavPackets?: boolean;
  deviceHeading?: number | null;
  gpsCourse?: number | null;
  speed?: number | null; // m/s or km/h
  movingThreshold?: number; // default 0.8 m/s (~3 km/h)
}

export interface ResolvedHeading {
  headingDeg: number | null;
  cardinal: string | null;
  source: HeadingSource;
  valid: boolean;
}

export function isValidHeadingNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val) && val >= 0 && val <= 360;
}

export function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function getCardinalDirection(deg: number): string {
  const normalized = normalizeHeading(deg);
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

export function resolveHeading(input: HeadingInput): ResolvedHeading {
  const {
    isLive = false,
    navigationHeading,
    hasNavPackets = false,
    deviceHeading,
    gpsCourse,
    speed,
    movingThreshold = 0.8, // 0.8 m/s ~ 2.88 km/h
  } = input;

  // 1. REAL InEKF / Navigation engine heading (Priority 1)
  if (isLive && hasNavPackets && isValidHeadingNumber(navigationHeading)) {
    const norm = Math.round(normalizeHeading(navigationHeading));
    return {
      headingDeg: norm,
      cardinal: getCardinalDirection(norm),
      source: 'navigation',
      valid: true,
    };
  }

  // 2. REAL Device Compass / Magnetometer Orientation (Priority 2)
  if (isValidHeadingNumber(deviceHeading)) {
    const norm = Math.round(normalizeHeading(deviceHeading));
    return {
      headingDeg: norm,
      cardinal: getCardinalDirection(norm),
      source: 'compass',
      valid: true,
    };
  }

  // 3. REAL Geolocation Course only when moving (Priority 3)
  const isMoving = typeof speed === 'number' && Number.isFinite(speed) && speed > movingThreshold;
  if (isMoving && isValidHeadingNumber(gpsCourse)) {
    const norm = Math.round(normalizeHeading(gpsCourse));
    return {
      headingDeg: norm,
      cardinal: getCardinalDirection(norm),
      source: 'course',
      valid: true,
    };
  }

  // 4. Fallback: No heading available
  return {
    headingDeg: null,
    cardinal: null,
    source: 'none',
    valid: false,
  };
}

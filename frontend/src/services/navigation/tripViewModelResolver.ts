/**
 * YatraSaarthi - Trip View Model Resolver
 *
 * Resolves complete and truthful view models for historical navigation sessions
 * by joining backend session telemetry with client-persisted route metadata,
 * geocoding cache, and saved routes.
 */

import type { SessionSummary, SessionDetail } from '../api/historyService';
import type { TripMetadata } from './tripMetadataService';
import type { SavedPlaceItem } from './savedRouteService';
import { geocodingService, getCoordKey } from '../location/geocodingService';

export interface ResolvedTripViewModel {
  sessionId: string;
  sourceName: string;
  destinationName: string;
  roadSummary?: string;
  distanceMeters: number;
  durationSeconds: number;
  vehicleType: string;
  geometry?: [number, number][];
  startLat?: number | null;
  startLon?: number | null;
  endLat?: number | null;
  endLon?: number | null;
  hasRealSourceName: boolean;
  hasRealDestName: boolean;
}

function isValidLocationName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed !== '' &&
    trimmed !== 'start location' &&
    trimmed !== 'destination' &&
    trimmed !== 'location unavailable' &&
    trimmed !== 'unknown location' &&
    trimmed !== 'active route'
  );
}

export function resolveTripViewModel(
  trip: SessionSummary,
  meta?: TripMetadata | null,
  detail?: SessionDetail | null,
  savedPlaces?: SavedPlaceItem[],
  geoNames?: Record<string, string>
): ResolvedTripViewModel {
  // 1. Extract start and end coordinates from all available sources in priority order
  let startLat: number | null | undefined = trip.start_lat;
  let startLon: number | null | undefined = trip.start_lon;
  let endLat: number | null | undefined = trip.end_lat;
  let endLon: number | null | undefined = trip.end_lon;

  // Check metadata source/destination coordinates
  if ((startLat === null || startLat === undefined) && meta?.sourceCoords) {
    startLon = meta.sourceCoords[0];
    startLat = meta.sourceCoords[1];
  }
  if ((endLat === null || endLat === undefined) && meta?.destinationCoords) {
    endLon = meta.destinationCoords[0];
    endLat = meta.destinationCoords[1];
  }

  // Check metadata geometry coordinates
  if ((startLat === null || startLat === undefined) && meta?.geometry && meta.geometry.length > 0) {
    startLon = meta.geometry[0][0];
    startLat = meta.geometry[0][1];
  }
  if ((endLat === null || endLat === undefined) && meta?.geometry && meta.geometry.length > 0) {
    endLon = meta.geometry[meta.geometry.length - 1][0];
    endLat = meta.geometry[meta.geometry.length - 1][1];
  }

  // Check detail trajectory points
  if ((startLat === null || startLat === undefined) && detail?.points && detail.points.length > 0) {
    startLat = detail.points[0].latitude;
    startLon = detail.points[0].longitude;
  }
  if ((endLat === null || endLat === undefined) && detail?.points && detail.points.length > 0) {
    endLat = detail.points[detail.points.length - 1].latitude;
    endLon = detail.points[detail.points.length - 1].longitude;
  }

  // 2. Resolve Source Name
  let sourceName = '';
  let hasRealSourceName = false;

  if (isValidLocationName(meta?.sourceName)) {
    sourceName = meta!.sourceName!;
    hasRealSourceName = true;
  } else if (startLat !== null && startLat !== undefined && startLon !== null && startLon !== undefined) {
    const key = getCoordKey(startLat, startLon);
    if (geoNames && geoNames[key]) {
      sourceName = geoNames[key];
      hasRealSourceName = true;
    } else {
      const cached = geocodingService.getCachedName(startLat, startLon);
      if (cached) {
        sourceName = cached;
        hasRealSourceName = true;
      }
    }

    if (!hasRealSourceName && savedPlaces && savedPlaces.length > 0) {
      const match = savedPlaces.find(
        (p) =>
          Math.abs(p.coordinates[1] - startLat!) < 0.01 &&
          Math.abs(p.coordinates[0] - startLon!) < 0.01
      );
      if (match) {
        sourceName = match.name;
        hasRealSourceName = true;
      }
    }

    if (!hasRealSourceName) {
      sourceName = `${startLat.toFixed(4)}, ${startLon.toFixed(4)}`;
    }
  }

  if (!sourceName) {
    sourceName = 'Location unavailable';
  }

  // 3. Resolve Destination Name
  let destinationName = '';
  let hasRealDestName = false;

  if (isValidLocationName(meta?.destinationName)) {
    destinationName = meta!.destinationName!;
    hasRealDestName = true;
  } else if (endLat !== null && endLat !== undefined && endLon !== null && endLon !== undefined) {
    const key = getCoordKey(endLat, endLon);
    if (geoNames && geoNames[key]) {
      destinationName = geoNames[key];
      hasRealDestName = true;
    } else {
      const cached = geocodingService.getCachedName(endLat, endLon);
      if (cached) {
        destinationName = cached;
        hasRealDestName = true;
      }
    }

    if (!hasRealDestName && savedPlaces && savedPlaces.length > 0) {
      const match = savedPlaces.find(
        (p) =>
          Math.abs(p.coordinates[1] - endLat!) < 0.01 &&
          Math.abs(p.coordinates[0] - endLon!) < 0.01
      );
      if (match) {
        destinationName = match.name;
        hasRealDestName = true;
      }
    }

    if (!hasRealDestName) {
      destinationName = `${endLat.toFixed(4)}, ${endLon.toFixed(4)}`;
    }
  }

  if (!destinationName) {
    destinationName = 'Location unavailable';
  }

  // 4. Resolve Road / Route summary
  let roadSummary = meta?.roadSummary;
  if (!roadSummary && isValidLocationName(destinationName)) {
    roadSummary = `Route to ${destinationName}`;
  }

  // 5. Distance and Duration
  const distanceMeters = (trip.distance_meters && trip.distance_meters > 0)
    ? trip.distance_meters
    : (meta?.distance_meters || 0);

  const durationSeconds = (trip.duration_seconds && trip.duration_seconds > 0)
    ? trip.duration_seconds
    : (meta?.duration_seconds || 0);

  // 6. Travel mode / vehicle
  const vehicleType = meta?.vehicleType || meta?.travelMode || trip.vehicle_type || 'CAR';

  // 7. Route geometry
  let geometry = meta?.geometry;
  if (!geometry && detail?.points && detail.points.length >= 2) {
    geometry = detail.points.map((p) => [p.longitude, p.latitude]);
  }

  return {
    sessionId: trip.session_id,
    sourceName,
    destinationName,
    roadSummary,
    distanceMeters,
    durationSeconds,
    vehicleType,
    geometry,
    startLat,
    startLon,
    endLat,
    endLon,
    hasRealSourceName,
    hasRealDestName,
  };
}

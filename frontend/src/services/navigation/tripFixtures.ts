/**
 * YatraSaarthi - Trip History Route Fixtures
 *
 * Pre-seeded route records originating from Vastral, Ahmedabad to key
 * Ahmedabad and Gandhinagar hubs, seamlessly merged into the main trip history.
 */

import type { SessionSummary } from '../api/historyService';
import type { TripMetadata } from './tripMetadataService';

export interface RouteTripFixture {
  summary: SessionSummary;
  metadata: TripMetadata;
}

const nowMs = Date.now();

export const TRIP_FIXTURES: RouteTripFixture[] = [
  {
    summary: {
      session_id: 'trip-vastral-maninagar',
      start_time: new Date(nowMs - 1000 * 60 * 60 * 2.5).toISOString(), // ~2.5 hrs ago (Today)
      end_time: new Date(nowMs - 1000 * 60 * 60 * 2.2).toISOString(),
      distance_meters: 6800,
      duration_seconds: 1080,
      vehicle_type: 'car',
      start_lat: 23.0039,
      start_lon: 72.6567,
      end_lat: 22.9978,
      end_lon: 72.6026,
    },
    metadata: {
      sessionId: 'trip-vastral-maninagar',
      sourceName: 'Vastral, Ahmedabad',
      destinationName: 'Maninagar, Ahmedabad',
      sourceCoords: [72.6567, 23.0039],
      destinationCoords: [72.6026, 22.9978],
      roadSummary: 'Vastral Road, Maninagar Cross Road',
      distance_meters: 6800,
      duration_seconds: 1080,
      travelMode: 'car',
      vehicleType: 'car',
      geometry: [
        [72.6567, 23.0039],
        [72.6480, 23.0028],
        [72.6395, 23.0012],
        [72.6280, 22.9995],
        [72.6160, 22.9982],
        [72.6026, 22.9978],
      ],
    },
  },
  {
    summary: {
      session_id: 'trip-vastral-railway-station',
      start_time: new Date(nowMs - 1000 * 60 * 60 * 5.5).toISOString(), // ~5.5 hrs ago (Today)
      end_time: new Date(nowMs - 1000 * 60 * 60 * 5.1).toISOString(),
      distance_meters: 9400,
      duration_seconds: 1440,
      vehicle_type: 'car',
      start_lat: 23.0039,
      start_lon: 72.6567,
      end_lat: 23.0229,
      end_lon: 72.6015,
    },
    metadata: {
      sessionId: 'trip-vastral-railway-station',
      sourceName: 'Vastral, Ahmedabad',
      destinationName: 'Ahmedabad Railway Station',
      sourceCoords: [72.6567, 23.0039],
      destinationCoords: [72.6015, 23.0229],
      roadSummary: 'NH47, Saraspur Bridge, Kalupur',
      distance_meters: 9400,
      duration_seconds: 1440,
      travelMode: 'car',
      vehicleType: 'car',
      geometry: [
        [72.6567, 23.0039],
        [72.6490, 23.0085],
        [72.6380, 23.0140],
        [72.6240, 23.0185],
        [72.6120, 23.0210],
        [72.6015, 23.0229],
      ],
    },
  },
  {
    summary: {
      session_id: 'trip-vastral-airport',
      start_time: new Date(nowMs - 1000 * 60 * 60 * 9).toISOString(), // ~9 hrs ago (Today)
      end_time: new Date(nowMs - 1000 * 60 * 60 * 8.4).toISOString(),
      distance_meters: 16200,
      duration_seconds: 1920,
      vehicle_type: 'car',
      start_lat: 23.0039,
      start_lon: 72.6567,
      end_lat: 23.0734,
      end_lon: 72.6347,
    },
    metadata: {
      sessionId: 'trip-vastral-airport',
      sourceName: 'Vastral, Ahmedabad',
      destinationName: 'Sardar Vallabhbhai Patel International Airport',
      sourceCoords: [72.6567, 23.0039],
      destinationCoords: [72.6347, 23.0734],
      roadSummary: 'SP Ring Road, Airport Road, Hansol',
      distance_meters: 16200,
      duration_seconds: 1920,
      travelMode: 'car',
      vehicleType: 'car',
      geometry: [
        [72.6567, 23.0039],
        [72.6680, 23.0250],
        [72.6710, 23.0480],
        [72.6550, 23.0650],
        [72.6347, 23.0734],
      ],
    },
  },
  {
    summary: {
      session_id: 'trip-vastral-gandhinagar',
      start_time: new Date(nowMs - 1000 * 60 * 60 * 26).toISOString(), // Yesterday
      end_time: new Date(nowMs - 1000 * 60 * 60 * 25.2).toISOString(),
      distance_meters: 30800,
      duration_seconds: 2640,
      vehicle_type: 'car',
      start_lat: 23.0039,
      start_lon: 72.6567,
      end_lat: 23.2156,
      end_lon: 72.6369,
    },
    metadata: {
      sessionId: 'trip-vastral-gandhinagar',
      sourceName: 'Vastral, Ahmedabad',
      destinationName: 'Gandhinagar',
      sourceCoords: [72.6567, 23.0039],
      destinationCoords: [72.6369, 23.2156],
      roadSummary: 'Sardar Patel Ring Road, SG Highway, GH Road',
      distance_meters: 30800,
      duration_seconds: 2640,
      travelMode: 'car',
      vehicleType: 'car',
      geometry: [
        [72.6567, 23.0039],
        [72.6720, 23.0500],
        [72.6680, 23.1100],
        [72.6550, 23.1650],
        [72.6369, 23.2156],
      ],
    },
  },
  {
    summary: {
      session_id: 'trip-vastral-akshardham',
      start_time: new Date(nowMs - 1000 * 60 * 60 * 30).toISOString(), // Yesterday
      end_time: new Date(nowMs - 1000 * 60 * 60 * 29.2).toISOString(),
      distance_meters: 34200,
      duration_seconds: 2880,
      vehicle_type: 'car',
      start_lat: 23.0039,
      start_lon: 72.6567,
      end_lat: 23.2323,
      end_lon: 72.6745,
    },
    metadata: {
      sessionId: 'trip-vastral-akshardham',
      sourceName: 'Vastral, Ahmedabad',
      destinationName: 'Akshardham, Gandhinagar',
      sourceCoords: [72.6567, 23.0039],
      destinationCoords: [72.6745, 23.2323],
      roadSummary: 'NH48, Gandhinagar Bypass, Sector 20',
      distance_meters: 34200,
      duration_seconds: 2880,
      travelMode: 'car',
      vehicleType: 'car',
      geometry: [
        [72.6567, 23.0039],
        [72.6720, 23.0500],
        [72.6750, 23.1250],
        [72.6680, 23.1850],
        [72.6745, 23.2323],
      ],
    },
  },
];

/**
 * Returns combined metadata map for all fixtures
 */
export function getFixtureMetadataMap(): Record<string, TripMetadata> {
  const map: Record<string, TripMetadata> = {};
  for (const item of TRIP_FIXTURES) {
    map[item.summary.session_id] = item.metadata;
  }
  return map;
}

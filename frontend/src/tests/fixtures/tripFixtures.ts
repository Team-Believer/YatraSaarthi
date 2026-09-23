/**
 * YatraSaarthi - Trip History Test Fixtures
 *
 * Dedicated test fixtures for validating trip resolution:
 * A. Full route metadata: Ahmedabad -> Gandhinagar
 * B. Coordinates only (no names)
 * C. Geometry only
 * D. No route metadata (honest fallback)
 * E. Two different sessions with different routes
 */

import type { SessionSummary } from '../../services/api/historyService';
import type { TripMetadata } from '../../services/navigation/tripMetadataService';
import { resolveTripViewModel, isMeaningfulTrip } from '../../services/navigation/tripViewModelResolver';
import { TRIP_FIXTURES } from '../../services/navigation/tripFixtures';

// Scenario A: Full route metadata
export const FIXTURE_A_SESSION: SessionSummary = {
  session_id: 'fixture-session-a',
  start_time: '2026-09-23T10:00:00.000Z',
  end_time: '2026-09-23T11:02:00.000Z',
  distance_meters: 30800,
  duration_seconds: 3720,
  vehicle_type: 'CAR',
  start_lat: 23.0225,
  start_lon: 72.5714,
  end_lat: 23.2156,
  end_lon: 72.6369,
};

export const FIXTURE_A_METADATA: TripMetadata = {
  sessionId: 'fixture-session-a',
  sourceName: 'Ahmedabad',
  destinationName: 'Gandhinagar',
  sourceCoords: [72.5714, 23.0225],
  destinationCoords: [72.6369, 23.2156],
  roadSummary: 'Sardar Patel Ring Road, NH48',
  distance_meters: 30800,
  duration_seconds: 3720,
  geometry: [
    [72.5714, 23.0225],
    [72.6000, 23.1000],
    [72.6369, 23.2156],
  ],
  travelMode: 'driving',
  vehicleType: 'CAR',
};

// Scenario B: Coordinates only
export const FIXTURE_B_SESSION: SessionSummary = {
  session_id: 'fixture-session-b',
  start_time: '2026-09-23T09:00:00.000Z',
  end_time: '2026-09-23T09:45:00.000Z',
  distance_meters: 15400,
  duration_seconds: 2700,
  vehicle_type: 'MOTORCYCLE',
  start_lat: 23.0225,
  start_lon: 72.5714,
  end_lat: 23.0734,
  end_lon: 72.6347,
};

// Scenario C: Geometry only
export const FIXTURE_C_SESSION: SessionSummary = {
  session_id: 'fixture-session-c',
  start_time: '2026-09-23T08:00:00.000Z',
  end_time: '2026-09-23T08:30:00.000Z',
  distance_meters: 8200,
  duration_seconds: 1800,
  vehicle_type: 'BICYCLE',
  start_lat: null,
  start_lon: null,
  end_lat: null,
  end_lon: null,
};

export const FIXTURE_C_METADATA: TripMetadata = {
  sessionId: 'fixture-session-c',
  geometry: [
    [72.5714, 23.0225],
    [72.5900, 23.0500],
    [72.6347, 23.0734],
  ],
  distance_meters: 8200,
  duration_seconds: 1800,
  vehicleType: 'BICYCLE',
};

// Scenario D: No route metadata (honest fallback)
export const FIXTURE_D_SESSION: SessionSummary = {
  session_id: 'fixture-session-d',
  start_time: '2026-09-22T12:00:00.000Z',
  end_time: '2026-09-22T12:05:00.000Z',
  distance_meters: 0,
  duration_seconds: 300,
  vehicle_type: 'CAR',
  start_lat: null,
  start_lon: null,
  end_lat: null,
  end_lon: null,
};

// Scenario E: Two distinct sessions with different routes
export const FIXTURE_E1_SESSION: SessionSummary = {
  session_id: 'fixture-session-e1',
  start_time: '2026-09-23T07:00:00.000Z',
  end_time: '2026-09-23T08:00:00.000Z',
  distance_meters: 30800,
  duration_seconds: 3600,
  vehicle_type: 'CAR',
  start_lat: 23.0225,
  start_lon: 72.5714,
  end_lat: 23.2156,
  end_lon: 72.6369,
};

export const FIXTURE_E1_METADATA: TripMetadata = {
  sessionId: 'fixture-session-e1',
  sourceName: 'Ahmedabad',
  destinationName: 'Gandhinagar',
  sourceCoords: [72.5714, 23.0225],
  destinationCoords: [72.6369, 23.2156],
  roadSummary: 'Sardar Patel Ring Road',
  distance_meters: 30800,
  duration_seconds: 3600,
  geometry: [[72.5714, 23.0225], [72.6369, 23.2156]],
  vehicleType: 'CAR',
};

export const FIXTURE_E2_SESSION: SessionSummary = {
  session_id: 'fixture-session-e2',
  start_time: '2026-09-23T14:00:00.000Z',
  end_time: '2026-09-23T16:00:00.000Z',
  distance_meters: 110000,
  duration_seconds: 7200,
  vehicle_type: 'CAR',
  start_lat: 23.0225,
  start_lon: 72.5714,
  end_lat: 22.3072,
  end_lon: 73.1812,
};

export const FIXTURE_E2_METADATA: TripMetadata = {
  sessionId: 'fixture-session-e2',
  sourceName: 'Ahmedabad',
  destinationName: 'Vadodara',
  sourceCoords: [72.5714, 23.0225],
  destinationCoords: [73.1812, 22.3072],
  roadSummary: 'NE1 Express Highway',
  distance_meters: 110000,
  duration_seconds: 7200,
  geometry: [[72.5714, 23.0225], [73.1812, 22.3072]],
  vehicleType: 'CAR',
};

/**
 * Executes validation on all fixture scenarios
 */
export function runFixtureValidation(): { passed: number; failed: number; errors: string[] } {
  const results = { passed: 0, failed: 0, errors: [] as string[] };
  function assert(condition: boolean, msg: string) {
    if (condition) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(msg);
      console.error(`[FAIL] ${msg}`);
    }
  }

  const geoNames: Record<string, string> = {
    '23.023,72.571': 'Ahmedabad',
    '23.216,72.637': 'Gandhinagar',
    '23.073,72.635': 'Airport',
    '22.307,73.181': 'Vadodara',
  };

  // Test A
  const resA = resolveTripViewModel(FIXTURE_A_SESSION, FIXTURE_A_METADATA, null, undefined, geoNames);
  assert(resA.sourceName === 'Ahmedabad', 'Test A source matches Ahmedabad');
  assert(resA.destinationName === 'Gandhinagar', 'Test A destination matches Gandhinagar');
  assert(resA.distanceMeters === 30800, 'Test A distance matches 30800');
  assert(resA.kind === 'recorded', 'Test A kind is recorded');
  assert(isMeaningfulTrip(resA) === true, 'Test A is a meaningful trip');

  // Test B
  const resB = resolveTripViewModel(FIXTURE_B_SESSION, null, null, undefined, geoNames);
  assert(resB.sourceName === 'Ahmedabad', 'Test B source matches Ahmedabad');
  assert(resB.destinationName === 'Airport', 'Test B destination matches Airport');
  assert(isMeaningfulTrip(resB) === true, 'Test B is a meaningful trip');

  // Test C
  const resC = resolveTripViewModel(FIXTURE_C_SESSION, FIXTURE_C_METADATA, null, undefined, geoNames);
  assert(resC.sourceName === 'Ahmedabad', 'Test C source matches Ahmedabad');
  assert(resC.destinationName === 'Airport', 'Test C destination matches Airport');
  assert(resC.geometry?.length === 3, 'Test C geometry points match');
  assert(isMeaningfulTrip(resC) === true, 'Test C is a meaningful trip');

  // Test D (Invalid trip with no route info -> honest fallback + filtered out)
  const resD = resolveTripViewModel(FIXTURE_D_SESSION, null, null, undefined, geoNames);
  assert(resD.sourceName === 'Location unavailable', 'Test D source is honest fallback');
  assert(resD.destinationName === 'Location unavailable', 'Test D destination is honest fallback');
  assert(isMeaningfulTrip(resD) === false, 'Test D invalid session is filtered out by isMeaningfulTrip');

  // Test E (Separation between E1 and E2)
  const resE1 = resolveTripViewModel(FIXTURE_E1_SESSION, FIXTURE_E1_METADATA, null, undefined, geoNames);
  const resE2 = resolveTripViewModel(FIXTURE_E2_SESSION, FIXTURE_E2_METADATA, null, undefined, geoNames);
  assert(resE1.destinationName === 'Gandhinagar', 'Test E1 destination matches Gandhinagar');
  assert(resE2.destinationName === 'Vadodara', 'Test E2 destination matches Vadodara');
  assert(resE1.sessionId !== resE2.sessionId, 'Test E sessions remain strictly separate');

  // Test F: Validate all 6 Vastral/Ahmedabad route fixtures
  assert(TRIP_FIXTURES.length === 6, 'All 6 Vastral/Ahmedabad route fixtures are configured');
  const fixtureIds = TRIP_FIXTURES.map(f => f.summary.session_id);
  assert(fixtureIds.includes('trip-vastral-maninagar'), 'Vastral -> Maninagar exists');
  assert(fixtureIds.includes('trip-vastral-railway-station'), 'Vastral -> Railway Station exists');
  assert(fixtureIds.includes('trip-vastral-airport'), 'Vastral -> Airport exists');
  assert(fixtureIds.includes('trip-vastral-gandhinagar'), 'Vastral -> Gandhinagar exists');
  assert(fixtureIds.includes('trip-vastral-akshardham'), 'Vastral -> Akshardham exists');
  assert(fixtureIds.includes('trip-ahmedabad-gandhinagar'), 'Ahmedabad -> Gandhinagar exists');

  // Check unique geometry for each fixture
  const geometries = TRIP_FIXTURES.map(f => JSON.stringify(f.metadata.geometry));
  const uniqueGeometries = new Set(geometries);
  assert(uniqueGeometries.size === 6, 'Each route fixture has its own unique route geometry');

  for (const f of TRIP_FIXTURES) {
    const vm = resolveTripViewModel(f.summary, f.metadata, null, undefined, undefined, 'fixture');
    assert(vm.kind === 'fixture', `Fixture ${f.summary.session_id} kind is fixture`);
    assert(isMeaningfulTrip(vm) === true, `Fixture ${f.summary.session_id} is meaningful`);
    assert(vm.sourceName !== 'Location unavailable', `Fixture ${f.summary.session_id} has valid source`);
    assert(vm.destinationName !== 'Location unavailable', `Fixture ${f.summary.session_id} has valid destination`);
  }

  return results;
}

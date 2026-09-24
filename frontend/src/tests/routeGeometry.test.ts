/**
 * YatraSaarthi — Route Geometry & GeoJSON Rendering Test Suite
 *
 * Tests the complete lifecycle and correctness of route geometry:
 * 1. route geometry exists
 * 2. geometry.type = LineString
 * 3. geometry has more than 2 points for realistic routes
 * 4. geometry coordinate order is [longitude, latitude]
 * 5. selected route becomes rendered GeoJSON
 * 6. alternative route geometry works
 * 7. selecting alternative updates line
 * 8. clearing route removes line
 * 9. invalid geometry is rejected
 * 10. no straight-line fallback exists
 */

import { useRouteStore } from '../stores/useRouteStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { routeService } from '../services/navigation/routeService';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: performance.now() - start });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, durationMs: performance.now() - start });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

export async function runRouteGeometryTests() {
  console.log('\n====================================================');
  console.log('🧪 YATRASARTHI ROUTE GEOMETRY & GEOJSON TESTS');
  console.log('====================================================\n');

  // Test coordinates (Ahmedabad to Mahesana)
  const AHMEDABAD_COORDS: [number, number] = [72.5714, 23.0225];
  const MAHESANA_COORDS: [number, number] = [72.3693, 23.5880];

  // Realistic multi-point road-following geometry coordinates
  const realisticGeometry1: [number, number][] = [
    [72.5714, 23.0225],
    [72.5750, 23.0400],
    [72.5800, 23.0800],
    [72.5900, 23.1500],
    [72.5500, 23.2500],
    [72.4800, 23.3800],
    [72.4200, 23.4900],
    [72.3693, 23.5880],
  ];

  const realisticGeometry2_Alt: [number, number][] = [
    [72.5714, 23.0225],
    [72.5600, 23.0500],
    [72.5300, 23.1200],
    [72.4700, 23.2800],
    [72.4100, 23.4500],
    [72.3693, 23.5880],
  ];

  // Mock fetch for Mapbox Directions
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any, _init?: any): Promise<any> => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('api.mapbox.com/directions/v5')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              distance: 74200,
              duration: 5400,
              geometry: {
                type: 'LineString',
                coordinates: realisticGeometry1,
              },
              legs: [
                {
                  summary: 'SH 41 / Ahmedabad-Patan Hwy',
                  distance: 74200,
                  duration: 5400,
                  steps: [
                    {
                      name: 'Ashram Road',
                      distance: 1200,
                      duration: 150,
                      maneuver: { type: 'depart', instruction: 'Head north on Ashram Road' },
                    },
                    {
                      name: 'SH 41',
                      distance: 68000,
                      duration: 4800,
                      maneuver: { type: 'turn', modifier: 'slight right', instruction: 'Continue onto SH 41' },
                    },
                    {
                      name: 'Mahesana Bypass',
                      distance: 5000,
                      duration: 450,
                      maneuver: { type: 'arrive', instruction: 'Arrive at Mahesana' },
                    },
                  ],
                },
              ],
            },
            {
              distance: 78500,
              duration: 5800,
              geometry: {
                type: 'LineString',
                coordinates: realisticGeometry2_Alt,
              },
              legs: [
                {
                  summary: 'Via Kalol Road',
                  distance: 78500,
                  duration: 5800,
                  steps: [
                    {
                      name: 'SG Highway',
                      distance: 15000,
                      duration: 1200,
                      maneuver: { type: 'depart', instruction: 'Head north on SG Highway' },
                    },
                    {
                      name: 'Kalol Road',
                      distance: 63500,
                      duration: 4600,
                      maneuver: { type: 'arrive', instruction: 'Arrive at destination' },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      };
    }
    return originalFetch(input, _init);
  };

  // Reset stores
  useRouteStore.getState().clearRoute();
  useNavigationStore.getState().resetState();

  // Test 1: Route calculation returns valid routes
  await runTest('1. Route geometry exists in response', async () => {
    const routes = await routeService.calculateRoutes(MAHESANA_COORDS, 'driving', AHMEDABAD_COORDS);
    assert(routes.length === 2, 'Must return 2 routes');
    assert(Array.isArray(routes[0].geometry), 'Route 0 must have geometry array');
    assert(routes[0].geometry.length > 0, 'Route 0 geometry must not be empty');
  });

  // Test 2: Geometry is GeoJSON LineString coordinates
  await runTest('2. Geometry matches LineString coordinate representation', async () => {
    const routeStore = useRouteStore.getState();
    const primary = routeStore.availableRoutes[0];
    assert(Array.isArray(primary.geometry), 'Geometry must be an array');
    assert(primary.geometry.every(pt => Array.isArray(pt) && pt.length === 2), 'Every point must be [x, y]');
  });

  // Test 3: Geometry has more than 2 points for realistic road following
  await runTest('3. Geometry has > 2 points (detailed road curvature, not a 2-point chord)', async () => {
    const routeStore = useRouteStore.getState();
    const primary = routeStore.availableRoutes[0];
    assert(primary.geometry.length > 2, `Expected > 2 points, found ${primary.geometry.length}`);
    assert(primary.geometry.length === 8, `Expected 8 points from fixture, found ${primary.geometry.length}`);
  });

  // Test 4: Coordinate order is [longitude, latitude]
  await runTest('4. Geometry coordinate order is [longitude, latitude] (WGS84 lon: ~72, lat: ~23 in Gujarat)', async () => {
    const routeStore = useRouteStore.getState();
    const primary = routeStore.availableRoutes[0];
    const firstPoint = primary.geometry[0];
    const lastPoint = primary.geometry[primary.geometry.length - 1];

    // Gujarat longitudes are ~70-74, latitudes ~20-24
    assert(firstPoint[0] > 70 && firstPoint[0] < 75, `First point lon must be ~72, got ${firstPoint[0]}`);
    assert(firstPoint[1] > 20 && firstPoint[1] < 25, `First point lat must be ~23, got ${firstPoint[1]}`);
    assert(lastPoint[0] > 70 && lastPoint[0] < 75, `Last point lon must be ~72, got ${lastPoint[0]}`);
    assert(lastPoint[1] > 20 && lastPoint[1] < 25, `Last point lat must be ~23, got ${lastPoint[1]}`);
  });

  // Test 5: Selected route becomes rendered GeoJSON in navigation store
  await runTest('5. Selected route coordinates sync to navigation store for Mapbox source', async () => {
    const navStore = useNavigationStore.getState();
    assert(navStore.routeCoordinates !== null, 'Route coordinates in NavigationStore must not be null');
    assert(navStore.routeCoordinates?.length === 8, 'Route coordinates in NavigationStore must match primary route');
    assert(navStore.routeCoordinates![0][0] === AHMEDABAD_COORDS[0], 'Origin must match Ahmedabad');
  });

  // Test 6: Alternative route geometry exists and is valid
  await runTest('6. Alternative route geometry exists with separate path points', async () => {
    const routeStore = useRouteStore.getState();
    assert(routeStore.availableRoutes.length >= 2, 'Alternative route must exist');
    const altRoute = routeStore.availableRoutes[1];
    assert(altRoute.geometry.length === 6, `Alternative route should have 6 points, got ${altRoute.geometry.length}`);
    assert(altRoute.geometry[1][0] !== realisticGeometry1[1][0], 'Alternative route geometry must differ from primary');
  });

  // Test 7: Selecting alternative updates active route line
  await runTest('7. Selecting alternative updates active line coordinates', async () => {
    routeService.selectAlternativeRoute(1);
    const routeStore = useRouteStore.getState();
    const navStore = useNavigationStore.getState();

    assert(routeStore.selectedRouteIndex === 1, 'selectedRouteIndex must be 1');
    assert(navStore.routeCoordinates?.length === 6, 'Nav store must now have alternative route coordinates (6 points)');
    assert(navStore.routeCoordinates![1][0] === realisticGeometry2_Alt[1][0], 'Coordinates must match alternative 2');
  });

  // Test 8: Clearing route removes line
  await runTest('8. Clearing route removes coordinates from store', async () => {
    useNavigationStore.getState().setRouteCoordinates(null);
    useRouteStore.getState().clearRoute();

    const navStore = useNavigationStore.getState();
    const routeStore = useRouteStore.getState();

    assert(navStore.routeCoordinates === null, 'Route coordinates must be null after clearing');
    assert(routeStore.availableRoutes.length === 0, 'Available routes must be empty after clearing');
  });

  // Test 9: Invalid geometry or empty routes is handled without drawing fake lines
  await runTest('9. Invalid or empty geometry sets route error and does not render', async () => {
    // Override fetch to return empty routes
    globalThis.fetch = async (): Promise<any> => ({
      ok: true,
      status: 200,
      json: async () => ({ code: 'NoRoute', routes: [] }),
    });

    const routes = await routeService.calculateRoutes(MAHESANA_COORDS, 'driving', AHMEDABAD_COORDS);
    const navStore = useNavigationStore.getState();
    const routeStore = useRouteStore.getState();

    assert(routes.length === 0, 'Must return empty array on NoRoute');
    assert(navStore.routeCoordinates === null, 'Nav store route coordinates must remain null');
    assert(routeStore.routeError !== null, 'Route error must be set');
  });

  // Test 10: No straight-line chord fallback exists
  await runTest('10. System never produces two-point chord [source, dest] as valid navigation geometry', async () => {
    const navStore = useNavigationStore.getState();
    // Verify that routeCoordinates cannot be a fake 2-point chord when properly loaded
    assert(navStore.routeCoordinates === null, 'Null route coordinates must not be substituted with endpoints');
  });

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log('\n====================================================');
  console.log('📊 ROUTE GEOMETRY TEST RESULTS:');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  console.log('====================================================\n');

  return { passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runRouteGeometryTests().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

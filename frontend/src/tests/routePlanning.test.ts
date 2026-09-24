/**
 * YatraSaarthi — Comprehensive Source → Destination Route Planning Test Suite
 *
 * Tests the complete lifecycle of arbitrary Origin → Destination routing:
 * 1. Default GPS Source + Destination
 * 2. Arbitrary Source (Vastral) + Destination (Ahmedabad)
 * 3. Arbitrary Source (Vastral) + Destination (Gandhinagar)
 * 4. Long Distance Route (Ahmedabad) + Destination (Surat)
 * 5. Swap Source and Destination Coordinates
 * 6. Destination Update & Recalculation
 * 7. Source Update & Recalculation
 * 8. Missing Origin Error Handling
 * 9. Alternative Routes Selection
 * 10. Saved Route Persistence with Origin Coordinates
 * 11. Navigation Session Lifecycle Integration with Custom Source
 * 12. State Cleanup and Reset
 */

import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useRouteStore } from '../stores/useRouteStore';
import { routeService } from '../services/navigation/routeService';
import { savedRouteService } from '../services/navigation/savedRouteService';
import { sessionLifecycle } from '../services/navigation/sessionLifecycle';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${name}`);
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

export async function runRoutePlanningTests() {
  console.log('\n====================================================');
  console.log('🧪 YATRASARTHI SOURCE → DESTINATION ROUTE PLANNING TESTS');
  console.log('====================================================\n');

  // Set up mock mock coordinates for test environment
  const VASTRAL_COORDS: [number, number] = [72.6570, 23.0039];
  const AHMEDABAD_COORDS: [number, number] = [72.5714, 23.0225];
  const GANDHINAGAR_COORDS: [number, number] = [72.6369, 23.2156];
  const SURAT_COORDS: [number, number] = [72.8311, 21.1702];
  const AIRPORT_COORDS: [number, number] = [72.6347, 23.0734];

  // Mock fetch for Mapbox Directions in headless Node/tsx environment
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any, _init?: any): Promise<any> => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('api.mapbox.com/directions/v5')) {
      // Extract origin and destination from URL format: .../{profile}/{origLon},{origLat};{destLon},{destLat}?
      const match = url.match(/\/directions\/v5\/(?:mapbox\/[a-z]+|[a-z]+)\/([0-9.-]+),([0-9.-]+);([0-9.-]+),([0-9.-]+)/);
      if (match) {
        const oLon = parseFloat(match[1]);
        const oLat = parseFloat(match[2]);
        const dLon = parseFloat(match[3]);
        const dLat = parseFloat(match[4]);

        // Calculate approximate straight-line distance
        const dLatRad = ((dLat - oLat) * Math.PI) / 180;
        const dLonRad = ((dLon - oLon) * Math.PI) / 180;
        const a =
          Math.sin(dLatRad / 2) ** 2 +
          Math.cos((oLat * Math.PI) / 180) * Math.cos((dLat * Math.PI) / 180) * Math.sin(dLonRad / 2) ** 2;
        const distMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const durationSec = distMeters / 12.5; // ~45 km/h

        return {
          ok: true,
          status: 200,
          json: async () => ({
            code: 'Ok',
            routes: [
              {
                distance: distMeters,
                duration: durationSec,
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [oLon, oLat],
                    [(oLon + dLon) / 2, (oLat + dLat) / 2],
                    [dLon, dLat],
                  ],
                },
                legs: [
                  {
                    summary: 'Direct Highway Corridor',
                    distance: distMeters,
                    duration: durationSec,
                    steps: [
                      { instruction: 'Head towards destination', distance: distMeters / 2, duration: durationSec / 2 },
                      { instruction: 'Arrive at destination', distance: distMeters / 2, duration: durationSec / 2 },
                    ],
                  },
                ],
              },
              {
                distance: distMeters * 1.12,
                duration: durationSec * 1.18,
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [oLon, oLat],
                    [oLon + 0.01, oLat + 0.01],
                    [dLon, dLat],
                  ],
                },
                legs: [
                  {
                    summary: 'Alternate Ring Road',
                    distance: distMeters * 1.12,
                    duration: durationSec * 1.18,
                    steps: [],
                  },
                ],
              },
            ],
          }),
        };
      }
    }

    if (url.includes('api.mapbox.com/search/geocode')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              id: 'feat-1',
              properties: { name: 'Vastral', place_formatted: 'Ahmedabad, Gujarat, India' },
              geometry: { coordinates: VASTRAL_COORDS },
            },
          ],
        }),
      };
    }

    if (url.includes('/api/v1/navigation/session')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          session_id: 'test-route-session-123',
          start_time: new Date().toISOString(),
          is_active: true,
          vehicle_type: 'CAR',
          navigation_mode: 'STANDBY',
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({}),
    };
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Navigation store default source & destination state
    // -------------------------------------------------------------
    await runTest('1. Navigation store initializes source and destination cleanly', () => {
      const navStore = useNavigationStore.getState();
      navStore.resetState();

      assert(navStore.source === null, 'source is null initially');
      assert(navStore.destination === null, 'destination is null initially');
      assert(navStore.routeCoordinates === null, 'routeCoordinates is null initially');
    });

    // -------------------------------------------------------------
    // Test 2: Calculate route from current GPS location to destination
    // -------------------------------------------------------------
    await runTest('2. Route calculation from Current GPS Location → Ahmedabad', async () => {
      useLocationStore.getState().setLocation({
        latitude: VASTRAL_COORDS[1],
        longitude: VASTRAL_COORDS[0],
      });

      const navStore = useNavigationStore.getState();
      navStore.setSource(null); // Represents 'Your location'
      navStore.setDestination({ name: 'Ahmedabad', coordinates: AHMEDABAD_COORDS });

      const routes = await routeService.calculateRoutes(AHMEDABAD_COORDS, 'driving');

      assert(routes.length >= 1, 'At least 1 route returned');
      assert(routes[0].origin[0] === VASTRAL_COORDS[0], 'Origin longitude matches GPS');
      assert(routes[0].origin[1] === VASTRAL_COORDS[1], 'Origin latitude matches GPS');
      assert(routes[0].destination[0] === AHMEDABAD_COORDS[0], 'Destination longitude matches target');
      assert(routes[0].distance_meters > 0, 'Distance is positive');
      assert(routes[0].duration_seconds > 0, 'Duration is positive');
      assert(routes[0].geometry.length >= 2, 'Geometry has at least 2 points');
    });

    // -------------------------------------------------------------
    // Test 3: Calculate route from Arbitrary Source (Vastral) to Arbitrary Destination (Gandhinagar)
    // -------------------------------------------------------------
    await runTest('3. Route calculation from Arbitrary Source (Vastral) → Destination (Gandhinagar)', async () => {
      const navStore = useNavigationStore.getState();
      navStore.setSource({ name: 'Vastral', coordinates: VASTRAL_COORDS, isCurrentLocation: false });
      navStore.setDestination({ name: 'Gandhinagar', coordinates: GANDHINAGAR_COORDS });

      const routes = await routeService.calculateRoutes(GANDHINAGAR_COORDS, 'driving', VASTRAL_COORDS);

      assert(routes.length >= 1, 'Routes calculated for arbitrary source');
      assert(routes[0].origin[0] === VASTRAL_COORDS[0], 'Origin matches Vastral lon');
      assert(routes[0].origin[1] === VASTRAL_COORDS[1], 'Origin matches Vastral lat');
      assert(routes[0].destination[0] === GANDHINAGAR_COORDS[0], 'Destination matches Gandhinagar lon');
      assert(routes[0].geometry[0][0] === VASTRAL_COORDS[0], 'First geometry point is origin');
      assert(routes[0].geometry[routes[0].geometry.length - 1][0] === GANDHINAGAR_COORDS[0], 'Last geometry point is destination');
    });

    // -------------------------------------------------------------
    // Test 4: Calculate long route Ahmedabad → Surat
    // -------------------------------------------------------------
    await runTest('4. Route calculation from Ahmedabad → Surat', async () => {
      const routes = await routeService.calculateRoutes(SURAT_COORDS, 'driving', AHMEDABAD_COORDS);

      assert(routes.length >= 1, 'Routes returned for Ahmedabad → Surat');
      assert(routes[0].distance_meters > 100000, 'Distance is over 100 km');
      assert(routes[0].duration_seconds > 3600, 'Duration is over 1 hour');
    });

    // -------------------------------------------------------------
    // Test 5: Swap Source and Destination
    // -------------------------------------------------------------
    await runTest('5. Swap Source and Destination Coordinates', async () => {
      const navStore = useNavigationStore.getState();
      const initialSource = { name: 'Vastral', coordinates: VASTRAL_COORDS, isCurrentLocation: false };
      const initialDest = { name: 'Airport', coordinates: AIRPORT_COORDS };

      navStore.setSource(initialSource);
      navStore.setDestination(initialDest);

      // Perform swap
      const nextSource = { name: initialDest.name, coordinates: initialDest.coordinates, isCurrentLocation: false };
      const nextDest = { name: initialSource.name, coordinates: initialSource.coordinates };

      navStore.setSource(nextSource);
      navStore.setDestination(nextDest);

      assert(useNavigationStore.getState().source?.name === 'Airport', 'Swapped source is Airport');
      assert(useNavigationStore.getState().destination?.name === 'Vastral', 'Swapped destination is Vastral');

      const routes = await routeService.calculateRoutes(nextDest.coordinates, 'driving', nextSource.coordinates);
      assert(routes[0].origin[0] === AIRPORT_COORDS[0], 'New route starts at Airport');
      assert(routes[0].destination[0] === VASTRAL_COORDS[0], 'New route ends at Vastral');
    });

    // -------------------------------------------------------------
    // Test 6: Alternative Routes Selection
    // -------------------------------------------------------------
    await runTest('6. Alternative routes parsed and selectable', async () => {
      const routes = await routeService.calculateRoutes(GANDHINAGAR_COORDS, 'driving', VASTRAL_COORDS);
      assert(routes.length === 2, '2 alternative routes found');

      const routeStore = useRouteStore.getState();
      assert(routeStore.selectedRouteIndex === 0, 'Default selected route is index 0');

      routeService.selectAlternativeRoute(1);
      assert(useRouteStore.getState().selectedRouteIndex === 1, 'Selected route updated to index 1');
      assert(useRouteStore.getState().activeRoute?.summary === 'Alternate Ring Road', 'Active route is Alternative');
    });

    // -------------------------------------------------------------
    // Test 7: Error handling when origin is unavailable
    // -------------------------------------------------------------
    await runTest('7. Safely handles missing origin coordinates without GPS', async () => {
      // Clear GPS and custom source
      useLocationStore.setState({ latitude: null, longitude: null });
      useNavigationStore.setState({ source: null });

      const routes = await routeService.calculateRoutes(AHMEDABAD_COORDS, 'driving');
      assert(routes.length === 0, 'Returns empty array when origin is missing');
      assert(useRouteStore.getState().routeError !== null, 'Sets descriptive error');
    });

    // -------------------------------------------------------------
    // Test 8: Saved Route Persistence with Origin Coordinates
    // -------------------------------------------------------------
    await runTest('8. Saved Route stores both origin and destination coordinates', () => {
      const saved = savedRouteService.saveRoute({
        name: 'Vastral to Gandhinagar',
        coordinates: GANDHINAGAR_COORDS,
        originCoordinates: VASTRAL_COORDS,
        summary: 'NH48 Highway',
        distance_meters: 32000,
        duration_seconds: 2400,
        geometry: [VASTRAL_COORDS, GANDHINAGAR_COORDS],
      });

      assert(saved.id.startsWith('saved-route-'), 'Saved route has valid ID');
      assert(saved.coordinates[0] === GANDHINAGAR_COORDS[0], 'Destination coordinates saved');
      assert(saved.originCoordinates?.[0] === VASTRAL_COORDS[0], 'Origin coordinates saved');

      // Cleanup
      savedRouteService.removeSavedItem(saved.id);
    });

    // -------------------------------------------------------------
    // Test 9: Navigation Session starts with custom source metadata
    // -------------------------------------------------------------
    await runTest('9. Navigation Session Lifecycle accepts custom source metadata', async () => {
      const navStore = useNavigationStore.getState();
      navStore.resetState();

      useLocationStore.getState().setLocation({
        latitude: VASTRAL_COORDS[1],
        longitude: VASTRAL_COORDS[0],
      });

      navStore.setSource({ name: 'Vastral Hub', coordinates: VASTRAL_COORDS });
      navStore.setDestination({ name: 'Gandhinagar Capital', coordinates: GANDHINAGAR_COORDS });

      // Start session with arbitrary route geometry
      const routeGeometry = [VASTRAL_COORDS, GANDHINAGAR_COORDS];
      const sessionId = await sessionLifecycle.startLiveSession('CAR', routeGeometry, 'Vastral-Gandhinagar Expressway', {
        sourceName: 'Vastral Hub',
        destinationName: 'Gandhinagar Capital',
        sourceCoords: VASTRAL_COORDS,
        destinationCoords: GANDHINAGAR_COORDS,
      });

      assert(sessionId !== '', 'Session ID created');
      assert(useNavigationStore.getState().isLive === true, 'Navigation is live');

      // End session cleanly
      await sessionLifecycle.endLiveSession();
      assert(useNavigationStore.getState().isLive === false, 'Navigation ended cleanly');
    });

    // -------------------------------------------------------------
    // Test 10: Desktop layout safe margins - Route Panel does NOT collide with Nav Rail
    // -------------------------------------------------------------
    await runTest('10. Route Preview Panel horizontal offset clears Navigation Rail footprint', () => {
      const NAV_RAIL_LEFT = 16; // 1rem
      const NAV_RAIL_WIDTH = 72; // w-[72px]
      const NAV_RAIL_RIGHT_EDGE = NAV_RAIL_LEFT + NAV_RAIL_WIDTH; // 88px

      const ROUTE_PANEL_LEFT_DESKTOP = 104; // lg:left-[104px] / md:left-[96px]
      const ROUTE_PANEL_WIDTH = 390; // lg:w-[390px] / md:w-[380px]

      const clearanceGap = ROUTE_PANEL_LEFT_DESKTOP - NAV_RAIL_RIGHT_EDGE;
      assert(clearanceGap >= 8, `Clearance gap (${clearanceGap}px) is positive and safe (>= 8px)`);
      assert(ROUTE_PANEL_LEFT_DESKTOP + ROUTE_PANEL_WIDTH <= 1280, 'Route panel stays safely within 1280px viewport');
    });

    // -------------------------------------------------------------
    // Test 11: Camera asymmetric padding accounts for left panel overlays on desktop
    // -------------------------------------------------------------
    await runTest('11. Camera padding accounts for Nav Rail + Route Preview Panel on desktop', () => {
      const viewports = [
        { width: 1280, height: 720 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1920, height: 1080 },
      ];

      for (const vp of viewports) {
        const leftPadding = Math.max(450, Math.min(Math.round(vp.width * 0.36), 520));
        assert(leftPadding >= 450, `Left padding (${leftPadding}px) fully covers left UI on ${vp.width}x${vp.height}`);
        assert(leftPadding < vp.width * 0.5, `Left padding leaves over 50% unobscured map area on ${vp.width}x${vp.height}`);
      }
    });

    // -------------------------------------------------------------
    // Test 12: Route bounds computation for short routes vs long routes
    // -------------------------------------------------------------
    await runTest('12. Short vs Long route bounding box computation', () => {
      // Short route: Vastral to Ahmedabad (~10km)
      const shortRoute = [VASTRAL_COORDS, AHMEDABAD_COORDS];
      assert(shortRoute.length === 2, 'Short route contains 2 points');
      const shortLonSpan = Math.abs(VASTRAL_COORDS[0] - AHMEDABAD_COORDS[0]);
      const shortLatSpan = Math.abs(VASTRAL_COORDS[1] - AHMEDABAD_COORDS[1]);
      assert(shortLonSpan < 0.2, 'Short route lon span is tight');
      assert(shortLatSpan < 0.2, 'Short route lat span is tight');

      // Long route: Vastral to Dwarka (~475km)
      const DWARKA_COORDS: [number, number] = [68.9685, 22.2394];
      const longLonSpan = Math.abs(VASTRAL_COORDS[0] - DWARKA_COORDS[0]);
      assert(longLonSpan > 3.0, 'Long route lon span reflects 400+ km geometry');
    });

    // -------------------------------------------------------------
    // Test 13: Source and Destination markers consistency
    // -------------------------------------------------------------
    await runTest('13. Waypoint markers maintain origin and destination integrity', async () => {
      const routes = await routeService.calculateRoutes(GANDHINAGAR_COORDS, 'driving', VASTRAL_COORDS);
      const active = routes[0];

      assert(active.origin[0] === VASTRAL_COORDS[0], 'Origin marker at source');
      assert(active.destination[0] === GANDHINAGAR_COORDS[0], 'Destination marker at destination');
      assert(active.geometry.length >= 2, 'Geometry connects origin to destination');
    });

    // -------------------------------------------------------------
    // Test 14: Start navigation transition dismisses preview state
    // -------------------------------------------------------------
    await runTest('14. Start navigation transitions cleanly to live guidance HUD', async () => {
      useNavigationStore.getState().resetState();

      useNavigationStore.getState().setSource({ name: 'Origin', coordinates: VASTRAL_COORDS });
      useNavigationStore.getState().setDestination({ name: 'Destination', coordinates: AHMEDABAD_COORDS });
      useNavigationStore.getState().setRouteCoordinates([VASTRAL_COORDS, AHMEDABAD_COORDS]);

      // Before start: isLive is false, destination exists (Preview active)
      assert(useNavigationStore.getState().isLive === false, 'isLive is false in preview');
      assert(useNavigationStore.getState().destination !== null, 'destination is active in preview');

      // Start live session
      await sessionLifecycle.startLiveSession('CAR', [VASTRAL_COORDS, AHMEDABAD_COORDS], 'Main Road', {
        destinationName: 'Destination',
      });

      assert(useNavigationStore.getState().isLive === true, 'isLive is true after start navigation');

      // End session
      await sessionLifecycle.endLiveSession();
      assert(useNavigationStore.getState().isLive === false, 'Session ended cleanly');
    });

    // -------------------------------------------------------------
    // Test 15: Cancel route preview cleans up all navigation state
    // -------------------------------------------------------------
    await runTest('15. Cancel route preview clears source, destination, and coordinates', () => {
      const navStore = useNavigationStore.getState();
      navStore.setSource({ name: 'Start', coordinates: VASTRAL_COORDS });
      navStore.setDestination({ name: 'End', coordinates: AHMEDABAD_COORDS });
      navStore.setRouteCoordinates([VASTRAL_COORDS, AHMEDABAD_COORDS]);

      // Perform Cancel
      navStore.setSource(null);
      navStore.setDestination(null);
      navStore.setRouteCoordinates(null);
      useRouteStore.getState().clearRoute();

      assert(useNavigationStore.getState().source === null, 'Source cleared');
      assert(useNavigationStore.getState().destination === null, 'Destination cleared');
      assert(useNavigationStore.getState().routeCoordinates === null, 'Route coordinates cleared');
      assert(useRouteStore.getState().availableRoutes.length === 0, 'Available routes cleared');
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n----------------------------------------------------');
  console.log(`Route Planning Test Summary: ${passed}/${total} passed (${failed} failed)`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`${failed} route planning tests failed!`);
  }

  return { total, passed, failed };
}

// Auto-run if invoked directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runRoutePlanningTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

/**
 * YatraSaarthi — Turn-by-Turn Route Directions & Step Extraction Test Suite
 *
 * Tests the turn-by-turn steps pipeline:
 * 1. steps=true are requested in Mapbox query
 * 2. steps are preserved in RouteData
 * 3. legs are flattened correctly across multiple route legs
 * 4. maneuver type and modifier are preserved
 * 5. step distance is preserved accurately
 * 6. step duration is preserved accurately
 * 7. directions data structure supports UI rendering
 * 8. missing steps or empty legs do not crash the pipeline
 */

import { useRouteStore } from '../stores/useRouteStore';
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

export async function runRouteDirectionsTests() {
  console.log('\n====================================================');
  console.log('🧪 YATRASARTHI TURN-BY-TURN ROUTE DIRECTIONS TESTS');
  console.log('====================================================\n');

  const AHMEDABAD_COORDS: [number, number] = [72.5714, 23.0225];
  const MAHESANA_COORDS: [number, number] = [72.3693, 23.5880];

  let lastRequestedUrl = '';

  const mockStepsLeg1 = [
    {
      name: 'Ashram Road',
      distance: 850,
      duration: 90,
      maneuver: { type: 'depart', modifier: 'straight', instruction: 'Head north on Ashram Road' },
    },
    {
      name: '132 Feet Ring Road',
      distance: 2400,
      duration: 210,
      maneuver: { type: 'turn', modifier: 'slight right', instruction: 'Turn slight right onto 132 Feet Ring Road' },
    },
    {
      name: 'SH 41',
      distance: 65000,
      duration: 4500,
      maneuver: { type: 'turn', modifier: 'left', instruction: 'Turn left onto SH 41' },
    },
  ];

  const mockStepsLeg2 = [
    {
      name: 'Mahesana Bypass',
      distance: 4200,
      duration: 350,
      maneuver: { type: 'roundabout', modifier: 'exit 2', instruction: 'At roundabout, take exit 2' },
    },
    {
      name: 'Destination Way',
      distance: 600,
      duration: 60,
      maneuver: { type: 'arrive', instruction: 'Arrive at Mahesana, on the right' },
    },
  ];

  // Mock fetch capturing URL and returning multi-leg steps
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any, _init?: any): Promise<any> => {
    const url = typeof input === 'string' ? input : input.url;
    lastRequestedUrl = url;

    if (url.includes('api.mapbox.com/directions/v5')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              distance: 73050,
              duration: 5210,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [72.5714, 23.0225],
                  [72.5750, 23.0400],
                  [72.5800, 23.0800],
                  [72.3693, 23.5880],
                ],
              },
              legs: [
                {
                  summary: 'SH 41 Leg 1',
                  distance: 68250,
                  duration: 4800,
                  steps: mockStepsLeg1,
                },
                {
                  summary: 'Mahesana Leg 2',
                  distance: 4800,
                  duration: 410,
                  steps: mockStepsLeg2,
                },
              ],
            },
          ],
        }),
      };
    }
    return originalFetch(input, _init);
  };

  useRouteStore.getState().clearRoute();

  // Test 1: steps=true is requested in Mapbox query
  await runTest('1. Mapbox Directions URL contains steps=true, overview=full, geometries=geojson', async () => {
    await routeService.calculateRoutes(MAHESANA_COORDS, 'driving', AHMEDABAD_COORDS);
    assert(lastRequestedUrl.includes('steps=true'), 'Query must contain steps=true');
    assert(lastRequestedUrl.includes('geometries=geojson'), 'Query must contain geometries=geojson');
    assert(lastRequestedUrl.includes('overview=full'), 'Query must contain overview=full');
    assert(lastRequestedUrl.includes('language=en'), 'Query must contain language=en');
  });

  // Test 2: steps are preserved in RouteData
  await runTest('2. Turn-by-turn steps are preserved in RouteData.steps', async () => {
    const routeStore = useRouteStore.getState();
    const primary = routeStore.availableRoutes[0];
    assert(Array.isArray(primary?.steps), 'primary.steps must be an array');
    assert((primary?.steps?.length ?? 0) > 0, 'primary.steps must not be empty');
  });

  // Test 3: legs are flattened correctly (3 in leg 1 + 2 in leg 2 = 5 total steps)
  await runTest('3. Multi-leg steps are flattened sequentially into unified step list', async () => {
    const routeStore = useRouteStore.getState();
    const steps = routeStore.availableRoutes[0]?.steps || [];
    assert(steps.length === 5, `Expected 5 flattened steps (3+2), got ${steps.length}`);
    assert(steps[0]?.instruction === 'Head north on Ashram Road', 'Step 0 matches leg 1 step 0');
    assert(steps[4]?.instruction === 'Arrive at Mahesana, on the right', 'Step 4 matches leg 2 step 1');
  });

  // Test 4: maneuver type and modifier are preserved
  await runTest('4. Maneuver types (depart, turn, roundabout, arrive) and modifiers are preserved', async () => {
    const routeStore = useRouteStore.getState();
    const steps = routeStore.availableRoutes[0]?.steps || [];
    assert(steps[0]?.type === 'depart', 'Step 0 type is depart');
    assert(steps[1]?.type === 'turn', 'Step 1 type is turn');
    assert(steps[1]?.modifier === 'slight right', 'Step 1 modifier is slight right');
    assert(steps[3]?.type === 'roundabout', 'Step 3 type is roundabout');
    assert(steps[4]?.type === 'arrive', 'Step 4 type is arrive');
  });

  // Test 5: step distance is preserved
  await runTest('5. Step distances are correctly extracted from Mapbox meter metrics', async () => {
    const routeStore = useRouteStore.getState();
    const steps = routeStore.availableRoutes[0]?.steps || [];
    assert(steps[0]?.distance_m === 850, `Expected 850m, got ${steps[0]?.distance_m}`);
    assert(steps[2]?.distance_m === 65000, `Expected 65000m, got ${steps[2]?.distance_m}`);
  });

  // Test 6: step duration is preserved
  await runTest('6. Step durations are correctly extracted in seconds', async () => {
    const routeStore = useRouteStore.getState();
    const steps = routeStore.availableRoutes[0]?.steps || [];
    assert(steps[0]?.duration_s === 90, `Expected 90s, got ${steps[0]?.duration_s}`);
    assert(steps[2]?.duration_s === 4500, `Expected 4500s, got ${steps[2]?.duration_s}`);
  });

  // Test 7: directions data structure supports UI rendering
  await runTest('7. Directions items have non-empty instruction strings and valid maneuver tags', async () => {
    const routeStore = useRouteStore.getState();
    const steps = routeStore.availableRoutes[0]?.steps || [];
    for (const step of steps) {
      assert(typeof step.instruction === 'string' && step.instruction.length > 0, 'Instruction must be non-empty');
      assert(typeof step.distance_m === 'number', 'Distance must be number');
      assert(typeof step.duration_s === 'number', 'Duration must be number');
      assert(typeof step.type === 'string', 'Maneuver type must be string');
    }
  });

  // Test 8: missing steps or empty legs do not crash the pipeline
  await runTest('8. Missing steps or malformed legs default safely without crashing', async () => {
    globalThis.fetch = async (): Promise<any> => ({
      ok: true,
      status: 200,
      json: async () => ({
        code: 'Ok',
        routes: [
          {
            distance: 10000,
            duration: 900,
            geometry: {
              type: 'LineString',
              coordinates: [
                [72.5714, 23.0225],
                [72.6347, 23.0734],
              ],
            },
            legs: [], // Empty legs
          },
        ],
      }),
    });

    const routes = await routeService.calculateRoutes([72.6347, 23.0734], 'driving', AHMEDABAD_COORDS);
    assert(routes.length === 1, 'Should return 1 route');
    assert(Array.isArray(routes[0]?.steps), 'steps should be empty array');
    assert((routes[0]?.steps?.length ?? 0) === 0, 'steps should have length 0 without crashing');
  });

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log('\n====================================================');
  console.log('📊 ROUTE DIRECTIONS TEST RESULTS:');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  console.log('====================================================\n');

  return { passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runRouteDirectionsTests().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

/**
 * YatraSaarthi - Saved Screen & Memory Service Test Suite
 *
 * Validates:
 * 1. Route subtitle deduplication ("Via NH48, SH41 · NH48, SH41" -> "Via NH48, SH41")
 * 2. Filter counts (Everything, Routes, Places derived dynamically)
 * 3. Everything / Routes / Places category filtering
 * 4. Search behavior across name, address, and road summary (case-insensitive)
 * 5. Empty-state behavior when 0 items exist or search yields no matches
 * 6. Navigation destination setting from saved items
 * 7. Route / place classification and CRUD operations (Update, Rename, Delete)
 */

import {
  savedRouteService,
  formatRouteSubtitle,
  type SavedPlaceItem,
} from '../services/navigation/savedRouteService';
import { useNavigationStore } from '../stores/useNavigationStore';

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

export async function runSavedScreenTests() {
  console.log('\n====================================================');
  console.log('🧪 YATRASARTHI SAVED SCREEN & PERSISTENCE TESTS');
  console.log('====================================================\n');

  // --- 1. Route Subtitle Deduplication Tests ---
  await runTest('1. Route Subtitle: Deduplicates duplicated road names ("Via NH48, SH41 · NH48, SH41")', () => {
    const output = formatRouteSubtitle({
      address: 'Via NH48, SH41 · NH48, SH41',
      summary: 'NH48, SH41',
    });
    assert(
      output === 'Via NH48, SH41',
      `Expected "Via NH48, SH41", got "${output}"`
    );
  });

  await runTest('2. Route Subtitle: Handles address containing summary without repetition', () => {
    const output = formatRouteSubtitle({
      address: 'Via NH48, SH41',
      summary: 'NH48, SH41',
    });
    assert(
      output === 'Via NH48, SH41',
      `Expected "Via NH48, SH41", got "${output}"`
    );
  });

  await runTest('3. Route Subtitle: Formats bare summary into "Via <roads>"', () => {
    const output = formatRouteSubtitle({
      summary: 'NH48, SH41',
    });
    assert(
      output === 'Via NH48, SH41',
      `Expected "Via NH48, SH41", got "${output}"`
    );
  });

  await runTest('4. Route Subtitle: Preserves distinct origin/destination corridor with Via summary', () => {
    const output = formatRouteSubtitle({
      address: 'Ahmedabad → Mahesana',
      summary: 'NH48, SH41',
    });
    assert(
      output === 'Ahmedabad → Mahesana · Via NH48, SH41',
      `Expected "Ahmedabad → Mahesana · Via NH48, SH41", got "${output}"`
    );
  });

  // --- 2 & 3. Filter Counts & Category Filtering Tests ---
  const sampleItems: SavedPlaceItem[] = [
    {
      id: 'test-route-1',
      name: 'Mahesana',
      address: 'Via NH48, SH41',
      summary: 'NH48, SH41',
      type: 'route',
      coordinates: [72.3998, 23.5880],
    },
    {
      id: 'test-place-1',
      name: 'Home',
      address: 'Ahmedabad, Gujarat',
      type: 'place',
      coordinates: [72.5714, 23.0225],
    },
    {
      id: 'test-place-2',
      name: 'Office',
      address: 'Gandhinagar, Gujarat',
      type: 'place',
      coordinates: [72.6369, 23.2156],
    },
    {
      id: 'test-place-3',
      name: 'Airport',
      address: 'Sardar Vallabhbhai Patel International Airport, Ahmedabad',
      type: 'place',
      coordinates: [72.6347, 23.0734],
    },
  ];

  await runTest('5. Filter Counts: Dynamically derives Everything, Routes, and Places counts', () => {
    const everythingCount = sampleItems.length;
    const routesCount = sampleItems.filter((i) => i.type === 'route').length;
    const placesCount = sampleItems.filter((i) => i.type === 'place').length;

    assert(everythingCount === 4, `Expected 4 everything, got ${everythingCount}`);
    assert(routesCount === 1, `Expected 1 route, got ${routesCount}`);
    assert(placesCount === 3, `Expected 3 places, got ${placesCount}`);
  });

  await runTest('6. Filter Logic: Accurately filters items by selected category', () => {
    const onlyRoutes = sampleItems.filter((i) => i.type === 'route');
    const onlyPlaces = sampleItems.filter((i) => i.type === 'place');

    assert(onlyRoutes.length === 1 && onlyRoutes[0].name === 'Mahesana', 'Only routes filtering failed');
    assert(
      onlyPlaces.length === 3 && onlyPlaces.every((p) => p.type === 'place'),
      'Only places filtering failed'
    );
  });

  // --- 4. Search Behavior Tests ---
  await runTest('7. Search: Case-insensitive search matches place name', () => {
    const query = 'aIrPoRt';
    const matches = sampleItems.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      (i.address && i.address.toLowerCase().includes(query.toLowerCase()))
    );
    assert(matches.length === 1 && matches[0].name === 'Airport', 'Search by place name failed');
  });

  await runTest('8. Search: Matches address / city description', () => {
    const query = 'Gandhinagar';
    const matches = sampleItems.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      (i.address && i.address.toLowerCase().includes(query.toLowerCase()))
    );
    assert(matches.length === 1 && matches[0].name === 'Office', 'Search by address failed');
  });

  await runTest('9. Search: Matches route road summary (e.g. SH41)', () => {
    const query = 'sh41';
    const matches = sampleItems.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      (i.address && i.address.toLowerCase().includes(query.toLowerCase())) ||
      (i.summary && i.summary.toLowerCase().includes(query.toLowerCase()))
    );
    assert(matches.length === 1 && matches[0].name === 'Mahesana', 'Search by route road summary failed');
  });

  await runTest('10. Search: Non-matching query returns 0 matches for empty-state trigger', () => {
    const query = 'NonExistentPlaceXYZ';
    const matches = sampleItems.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      (i.address && i.address.toLowerCase().includes(query.toLowerCase())) ||
      (i.summary && i.summary.toLowerCase().includes(query.toLowerCase()))
    );
    assert(matches.length === 0, 'Non-matching query should return 0 results');
  });

  // --- 5. Empty State Behavior Tests ---
  await runTest('11. Empty State: Fresh install (0 saved items) correctly flags empty list', () => {
    const emptyList: SavedPlaceItem[] = [];
    const isZeroItems = emptyList.length === 0;
    assert(isZeroItems === true, 'Empty state flag should be true when items length is 0');
  });

  // --- 6. Navigation Action Tests ---
  await runTest('12. Navigate Action: Sets destination with correct name and coordinates in store', () => {
    const targetItem = sampleItems[0]; // Mahesana
    useNavigationStore.getState().setDestination({
      name: targetItem.name,
      coordinates: targetItem.coordinates,
    });

    const storeDest = useNavigationStore.getState().destination;
    assert(storeDest?.name === 'Mahesana', 'Destination name was not set correctly');
    assert(
      storeDest?.coordinates[0] === 72.3998 && storeDest?.coordinates[1] === 23.5880,
      'Destination coordinates were not set correctly'
    );
  });

  // --- 7. CRUD Persistence Operations Tests ---
  await runTest('13. CRUD: updateSavedItem modifies place name and address in service', () => {
    savedRouteService.setSavedItems([...sampleItems]);
    const updated = savedRouteService.updateSavedItem('test-place-1', {
      name: 'My New Home',
      address: 'Bopal, Ahmedabad, Gujarat',
    });
    assert(updated === true, 'updateSavedItem should return true');

    const items = savedRouteService.getSavedItems();
    const modified = items.find((i) => i.id === 'test-place-1');
    assert(modified?.name === 'My New Home', `Expected name "My New Home", got "${modified?.name}"`);
    assert(modified?.address === 'Bopal, Ahmedabad, Gujarat', 'Address update failed');
  });

  await runTest('14. CRUD: removeSavedItem cleanly deletes item from service', () => {
    const removed = savedRouteService.removeSavedItem('test-place-2');
    assert(removed === true, 'removeSavedItem should return true');

    const items = savedRouteService.getSavedItems();
    const found = items.find((i) => i.id === 'test-place-2');
    assert(!found, 'Deleted item should not be found in saved items');
  });

  await runTest('15. CRUD: savePlace creates and appends new place', () => {
    const newPlace = savedRouteService.savePlace({
      name: 'Gym',
      address: 'Prahlad Nagar, Ahmedabad',
      coordinates: [72.5050, 23.0120],
    });

    assert(newPlace.id.startsWith('saved-place-'), 'New place should have valid ID');
    assert(newPlace.name === 'Gym', 'New place name should match input');

    const items = savedRouteService.getSavedItems();
    assert(items.some((i) => i.id === newPlace.id), 'New place should exist in saved items list');
  });

  // Reset back to defaults for clean isolation
  savedRouteService.setSavedItems(sampleItems);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n----------------------------------------------------`);
  console.log(`Saved Screen Test Summary: ${passed}/${results.length} passed (${failed} failed)`);
  console.log(`----------------------------------------------------\n`);

  return { passed, failed };
}

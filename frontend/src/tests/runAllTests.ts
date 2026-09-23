/**
 * YatraSaarthi - Frontend Test Runner
 *
 * Runs test suites for:
 * 1. Timezone & IST Formatting Validation
 * 2. Trip ViewModel & Fixture Resolution Validation
 */

import { runTimeFormatTests } from './timeFormat.test';
import { runFixtureValidation } from './fixtures/tripFixtures';
import { runOfflineDrOnnxTests } from './offlineDrOnnx.test';
import { runFailoverReplayTest } from './failoverReplay.test';

export function runAllFrontendTests() {
  console.log('====================================================');
  console.log('🚀 YATRA SAARTHI FRONTEND TEST SUITE EXECUTION');
  console.log('====================================================\n');

  console.log('--- 1. IST Timezone & Date Formatting Tests ---');
  const timeResults = runTimeFormatTests();

  console.log('\n--- 2. Trip Fixture & ViewModel Resolution Tests ---');
  const fixtureResults = runFixtureValidation();

  console.log('\n--- 3. Client-Side Dead Reckoning & Preprocessing Tests ---');
  const drResults = runOfflineDrOnnxTests();

  console.log('\n--- 4. Dual-Engine Failover Replay & Handoff Tests ---');
  const failoverResults = runFailoverReplayTest();
  failoverResults.log.forEach((l) => console.log(`  ${l}`));
  console.log(`  ✓ Failover Test Passed: ${failoverResults.passed}`);
  console.log(`  ✓ Max Step Delta: ${failoverResults.maxDiscrepancyM.toFixed(3)}m (no teleportation)`);
  console.log(`  ✓ Trajectory Total Points: ${failoverResults.trajectoryPointsCount}`);

  console.log('\n====================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY:');
  console.log(`Timezone Tests:   ${timeResults.passed} passed, ${timeResults.failed} failed`);
  console.log(`Fixture Tests:    ${fixtureResults.passed} passed, ${fixtureResults.failed} failed`);
  console.log(`Dead-Reckon Tests: ${drResults.passed} passed, ${drResults.failed} failed`);
  console.log(`Failover Replay:  ${failoverResults.passed ? '1 passed, 0 failed' : '0 passed, 1 failed'}`);
  console.log('====================================================');

  const totalFailed = timeResults.failed + fixtureResults.failed + drResults.failed + (failoverResults.passed ? 0 : 1);
  if (totalFailed > 0) {
    console.error(`❌ Total failures: ${totalFailed}`);
    return false;
  } else {
    console.log('✅ ALL TEST SUITES PASSED SUCCESSFULLY!');
    return true;
  }
}

// Automatically run if executed directly in node/tsx or imported
if (typeof window === 'undefined') {
  runAllFrontendTests();
}

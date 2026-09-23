/**
 * YatraSaarthi - Frontend Test Runner
 *
 * Runs test suites for:
 * 1. Timezone & IST Formatting Validation
 * 2. Trip ViewModel & Fixture Resolution Validation
 */

import { runTimeFormatTests } from './timeFormat.test';
import { runFixtureValidation } from './fixtures/tripFixtures';

export function runAllFrontendTests() {
  console.log('====================================================');
  console.log('🚀 YATRA SAARTHI FRONTEND TEST SUITE EXECUTION');
  console.log('====================================================\n');

  console.log('--- 1. IST Timezone & Date Formatting Tests ---');
  const timeResults = runTimeFormatTests();

  console.log('\n--- 2. Trip Fixture & ViewModel Resolution Tests ---');
  const fixtureResults = runFixtureValidation();

  console.log('\n====================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY:');
  console.log(`Timezone Tests: ${timeResults.passed} passed, ${timeResults.failed} failed`);
  console.log(`Fixture Tests:  ${fixtureResults.passed} passed, ${fixtureResults.failed} failed`);
  console.log('====================================================');

  const totalFailed = timeResults.failed + fixtureResults.failed;
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

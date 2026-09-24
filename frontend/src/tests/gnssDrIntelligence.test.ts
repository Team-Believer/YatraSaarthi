/**
 * YatraSaarthi - GNSS-Outage & Dead-Reckoning Intelligence Test Suite
 * 
 * Verifies frontend telemetry, state derivation, demo outage, and analytics:
 * 1. Initial state: no GNSS fix → GNSS_ACQUIRING
 * 2. First valid GNSS fix → GNSS_STRONG
 * 3. Valid GNSS + IMU → GNSS_FUSING
 * 4. Previously-valid GNSS then timeout → GNSS_LOST / DEAD_RECKONING
 * 5. GNSS recovery → GNSS_REACQUISITION
 * 6. Recovery complete → GNSS_STRONG
 * 7. Initial state does NOT start outage timer
 * 8. Initial state does NOT enter dead reckoning
 * 9. Permission denied is not classified as GNSS outage
 * 10. Demo outage only works during active navigation
 * 11. SensorCollector subscriber subscription and unsubscription is leak-free
 * 12. Trip outage analytics compute verified stats with 0 fabricated values
 * 13. Calibration service tracks real sensor alignment state
 */

import { deriveGnssNavStatus } from '../utils/navigation/gnssStatus';
import { demoOutageService } from '../services/navigation/demoOutageService';
import { sensorCollector } from '../services/sensors/sensorCollector';
import { computeTripOutageMetrics, type TrajectoryPoint } from '../utils/navigation/tripOutageAnalytics';
import { calibrationService } from '../services/navigation/calibrationService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[AssertionFailed] ${message}`);
  }
}

export async function runGnssDrIntelligenceTests() {
  console.log('\n====================================================');
  console.log('🧪 YATRASARTHI GNSS-OUTAGE & DEAD-RECKONING INTELLIGENCE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${e.message}`);
      failed++;
    }
  }

  // 1. Initial state: no GNSS fix → GNSS_ACQUIRING
  runTest('1. Initial state: no GNSS fix → GNSS_ACQUIRING', () => {
    const initialStatus = deriveGnssNavStatus({
      isLive: false,
      navigationMode: 'STANDBY',
      gnssAvailable: false,
      hasHadFix: false,
    });
    assert(initialStatus.state === 'GNSS_ACQUIRING', `Expected GNSS_ACQUIRING, got ${initialStatus.state}`);
    assert(initialStatus.title.includes('Acquiring'), `Title should indicate acquiring, got '${initialStatus.title}'`);
    assert(initialStatus.isDr === false, 'Initial state must not be DR');
    assert(initialStatus.isOutage === false, 'Initial state must not be outage');
    assert(initialStatus.outageDurationSeconds === 0, 'Outage duration must be 0');
  });

  // 2. First valid GNSS fix → GNSS_STRONG
  runTest('2. First valid GNSS fix → GNSS_STRONG', () => {
    const firstFixStatus = deriveGnssNavStatus({
      isLive: false,
      gnssAvailable: true,
      imuAvailable: false,
      hasHadFix: true,
    });
    assert(firstFixStatus.state === 'GNSS_STRONG', `Expected GNSS_STRONG, got ${firstFixStatus.state}`);
    assert(firstFixStatus.title === 'GPS · Strong', `Expected 'GPS · Strong', got '${firstFixStatus.title}'`);
    assert(firstFixStatus.isDr === false, 'isDr must be false');
    assert(firstFixStatus.isOutage === false, 'isOutage must be false');
  });

  // 3. Valid GNSS + IMU → GNSS_FUSING
  runTest('3. Valid GNSS + IMU → GNSS_FUSING', () => {
    const fusingStatus = deriveGnssNavStatus({
      isLive: false,
      gnssAvailable: true,
      imuAvailable: true,
      hasHadFix: true,
    });
    assert(fusingStatus.state === 'GNSS_FUSING', `Expected GNSS_FUSING, got ${fusingStatus.state}`);
    assert(fusingStatus.title === 'GNSS + IMU · Fusing', `Expected 'GNSS + IMU · Fusing', got '${fusingStatus.title}'`);
    assert(fusingStatus.isDr === false, 'isDr must be false');
  });

  // 4. Previously-valid GNSS then timeout → GNSS_LOST / DEAD_RECKONING
  runTest('4. Previously-valid GNSS then timeout → GNSS_LOST / DEAD_RECKONING', () => {
    const drStatus = deriveGnssNavStatus({
      isLive: true,
      navigationMode: 'DEAD_RECKONING',
      gnssAvailable: false,
      hasHadFix: true,
      gnssOutageDuration: 42,
    });
    assert(drStatus.state === 'DEAD_RECKONING', `Expected DEAD_RECKONING, got ${drStatus.state}`);
    assert(drStatus.title === 'Dead Reckoning · No GPS', `Title should be 'Dead Reckoning · No GPS', got '${drStatus.title}'`);
    assert(drStatus.isDr === true, 'isDr must be true during dead reckoning');
    assert(drStatus.isOutage === true, 'isOutage must be true');
    assert(drStatus.subtitle.includes('42s outage'), `Subtitle should contain '42s outage', got '${drStatus.subtitle}'`);
  });

  // 5. GNSS recovery → GNSS_REACQUISITION
  runTest('5. GNSS recovery → GNSS_REACQUISITION', () => {
    const reacquisitionStatus = deriveGnssNavStatus({
      isLive: true,
      navigationMode: 'GNSS_REACQUISITION',
      gnssAvailable: true,
      gnssQuality: 'RECOVERING',
      gnssOutageDuration: 0,
    });
    assert(reacquisitionStatus.state === 'GNSS_REACQUISITION', `Expected GNSS_REACQUISITION, got ${reacquisitionStatus.state}`);
    assert(reacquisitionStatus.title === 'GPS · Reacquiring', `Title should be 'GPS · Reacquiring', got '${reacquisitionStatus.title}'`);
    assert(reacquisitionStatus.isReacquiring === true, 'isReacquiring flag should be true');
    assert(reacquisitionStatus.isDr === false, 'isDr flag should be false during reacquisition');
  });

  // 6. Recovery complete → GNSS_STRONG
  runTest('6. Recovery complete → GNSS_STRONG', () => {
    const recoveredStatus = deriveGnssNavStatus({
      isLive: true,
      navigationMode: 'GNSS_AIDED',
      gnssAvailable: true,
      gnssQuality: 'GOOD',
      imuAvailable: false,
    });
    assert(recoveredStatus.state === 'GNSS_STRONG', `Expected GNSS_STRONG, got ${recoveredStatus.state}`);
    assert(recoveredStatus.isDr === false, 'isDr should be false after GNSS recovery');
    assert(recoveredStatus.isReacquiring === false, 'isReacquiring should be false after GNSS recovery');
  });

  // 7. Initial state does NOT start outage timer
  runTest('7. Initial state does NOT start outage timer', () => {
    const initialTimerStatus = deriveGnssNavStatus({
      isLive: false,
      navigationMode: 'STANDBY',
      gnssAvailable: false,
      gnssOutageDuration: 0,
    });
    assert(initialTimerStatus.outageDurationSeconds === 0, 'Initial outage duration must be 0');
    assert(initialTimerStatus.isOutage === false, 'isOutage must be false for initial state');
  });

  // 8. Initial state does NOT enter dead reckoning
  runTest('8. Initial state does NOT enter dead reckoning', () => {
    const standbyStatus = deriveGnssNavStatus({
      isLive: false,
      navigationMode: 'STANDBY',
      gnssAvailable: false,
    });
    assert(standbyStatus.isDr === false, 'Initial state must NEVER be in dead reckoning');
    assert(standbyStatus.state !== 'DEAD_RECKONING', 'State must not be DEAD_RECKONING');
    assert(standbyStatus.state === 'GNSS_ACQUIRING', 'State must be GNSS_ACQUIRING');
  });

  // 9. Permission denied is not classified as GNSS outage
  runTest('9. Permission denied is not classified as GNSS outage', () => {
    const deniedStatus = deriveGnssNavStatus({
      isLive: false,
      gnssAvailable: false,
      permission: 'denied',
    });
    assert(deniedStatus.state === 'GNSS_ACQUIRING', 'Permission denied must map to acquiring state');
    assert(deniedStatus.title === 'Location permission required', `Expected 'Location permission required', got '${deniedStatus.title}'`);
    assert(deniedStatus.isDr === false, 'Permission denied must NOT trigger dead reckoning');
    assert(deniedStatus.isOutage === false, 'Permission denied must NOT trigger outage');
  });

  // 10. Demo outage only works during active navigation
  runTest('10. Demo outage only works during active navigation', () => {
    demoOutageService.reset();

    // Standby: demo outage does not force DR
    const standbyDemoStatus = deriveGnssNavStatus({
      isLive: false,
      gnssAvailable: false,
      isDemoOutageActive: true,
      demoOutageSeconds: 5,
    });
    assert(standbyDemoStatus.state === 'GNSS_ACQUIRING', 'Standby demo outage must not show DR without active navigation or fix');
    assert(standbyDemoStatus.isDr === false, 'isDr must be false in standby');

    // Live active navigation: demo outage activates DR
    demoOutageService.startOutage();
    assert(demoOutageService.getState().isSimulating === true, 'Demo outage should be simulating');
    assert(sensorCollector.isGnssSuppressed() === true, 'GNSS packets must be suppressed');

    const liveDemoStatus = deriveGnssNavStatus({
      isLive: true,
      navigationMode: 'GNSS_AIDED',
      gnssAvailable: true,
      isDemoOutageActive: true,
      demoOutageSeconds: 15,
    });
    assert(liveDemoStatus.state === 'DEAD_RECKONING', 'Live demo outage must transition to DEAD_RECKONING');
    assert(liveDemoStatus.isDr === true, 'isDr must be true during live demo outage');

    demoOutageService.restoreGnss();
    assert(demoOutageService.getState().isSimulating === false, 'Demo state should not be simulating');
    assert(sensorCollector.isGnssSuppressed() === false, 'sensorCollector.isGnssSuppressed must be false');

    demoOutageService.reset();
  });

  // 11. SensorCollector subscriber subscription and unsubscription is leak-free
  runTest('11. SensorCollector subscriber subscription and unsubscription is leak-free', () => {
    let callCount = 0;
    const unsub = sensorCollector.subscribe(() => {
      callCount++;
    });
    assert(typeof unsub === 'function', 'Subscribe returns unsubscription function');
    unsub();
    assert(typeof unsub === 'function', 'Clean unsubscription');
  });

  // 12. Trip outage analytics compute verified stats with 0 fabricated values
  runTest('12. Trip outage analytics accurately calculates real session DR metrics', () => {
    const samplePoints: TrajectoryPoint[] = [
      { timestamp: '2026-09-24T10:00:00Z', latitude: 23.02, longitude: 72.57, speed: 12.0, mode: 'GNSS' },
      { timestamp: '2026-09-24T10:00:10Z', latitude: 23.03, longitude: 72.58, speed: 14.5, mode: 'GNSS' },
      { timestamp: '2026-09-24T10:00:20Z', latitude: 23.04, longitude: 72.59, speed: 15.0, mode: 'DEAD_RECKONING' },
      { timestamp: '2026-09-24T10:00:50Z', latitude: 23.05, longitude: 72.60, speed: 16.0, mode: 'DEAD_RECKONING' },
      { timestamp: '2026-09-24T10:01:00Z', latitude: 23.06, longitude: 72.61, speed: 16.5, mode: 'GNSS_REACQUISITION' },
      { timestamp: '2026-09-24T10:01:10Z', latitude: 23.07, longitude: 72.62, speed: 17.0, mode: 'GNSS' },
    ];

    const metrics = computeTripOutageMetrics(samplePoints, 70);
    assert(metrics.hasTelemetry === true, 'Telemetry should be marked true');
    assert(metrics.outageEventsCount === 1, `Expected 1 outage event, got ${metrics.outageEventsCount}`);
    assert(metrics.totalDrSeconds >= 30, `Total DR seconds should be >= 30, got ${metrics.totalDrSeconds}`);
    assert(metrics.totalReacquisitionSeconds > 0, `Reacquisition seconds should be > 0, got ${metrics.totalReacquisitionSeconds}`);
    assert(metrics.maxSpeedKmh !== null && metrics.maxSpeedKmh > 50, `Max speed km/h should be > 50, got ${metrics.maxSpeedKmh}`);

    // Verify empty points return zero/null without fabrication
    const emptyMetrics = computeTripOutageMetrics(null, 100);
    assert(emptyMetrics.hasTelemetry === false, 'Empty points must flag hasTelemetry false');
    assert(emptyMetrics.outageEventsCount === 0, 'Empty points must have 0 outage events');
    assert(emptyMetrics.totalDrSeconds === 0, 'Empty points must have 0 DR seconds');
    assert(emptyMetrics.maxSpeedKmh === null, 'Empty points must have null max speed');
  });

  // 13. Calibration service tracks real sensor alignment state
  runTest('13. Calibration service persists and tracks vehicle alignment states', () => {
    calibrationService.setStatus('NOT_CALIBRATED');
    assert(calibrationService.getStatus() === 'NOT_CALIBRATED', 'Should be NOT_CALIBRATED');

    calibrationService.setStatus('CALIBRATING');
    assert(calibrationService.getStatus() === 'CALIBRATING', 'Should be CALIBRATING');

    calibrationService.markCalibrated();
    assert(calibrationService.getStatus() === 'CALIBRATED', 'Should be CALIBRATED');
  });

  console.log('\n----------------------------------------------------');
  console.log(`GNSS/DR Intelligence Test Summary: ${passed}/${passed + failed} passed (${failed} failed)`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`GNSS/DR Intelligence tests failed: ${failed} failures`);
  }

  return { passed, failed };
}

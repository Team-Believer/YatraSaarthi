/**
 * YatraSaarthi - Client-Side Dead-Reckoning & ONNX Neural Pipeline Tests
 */

import {
  ClientFeaturePipeline,
  ClientInEKF,
  DecileScalarCalibrator,
} from '../services/offline/offlineDrEnginePoc';
import goldenFixture from './fixtures/golden_e5_u2_fixture.json';
import replayFixture from './fixtures/replay_validation_fixture.json';

export interface TestSummary {
  name: string;
  passed: number;
  failed: number;
  errors: string[];
}

export function runOfflineDrOnnxTests(): TestSummary {
  const summary: TestSummary = {
    name: 'Client-Side Dead Reckoning & Preprocessing Tests',
    passed: 0,
    failed: 0,
    errors: [],
  };

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      summary.passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      summary.failed++;
      const errMsg = `FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      summary.errors.push(errMsg);
      console.error(`  ✗ ${errMsg}`);
    }
  }

  // 1. Preprocessing Parity Test
  try {
    const pipeline = new ClientFeaturePipeline();
    const rawWindow50x6: number[][] = goldenFixture.raw_imu_50x6;
    const expectedFeat50x15: number[][] = (goldenFixture as any).features_15;

    const flat15 = pipeline.processWindow(rawWindow50x6);
    assert(flat15.length === 50 * 15, 'Feature matrix flattened length is 750 elements (50x15)');

    let maxDiff = 0;
    for (let i = 0; i < 50; i++) {
      for (let c = 0; c < 15; c++) {
        const diff = Math.abs(flat15[i * 15 + c] - expectedFeat50x15[i][c]);
        if (diff > maxDiff) maxDiff = diff;
      }
    }
    assert(maxDiff < 1e-4, `Preprocessing 50x15 feature numerical equivalence (max diff: ${maxDiff.toExponential(3)})`);
  } catch (err: any) {
    assert(false, 'Preprocessing pipeline test', err.message);
  }

  // 2. Decile Scalar Calibrator Test
  try {
    const calib = new DecileScalarCalibrator();
    const { sigma, variance } = calib.calibrate(0.588035);
    const expectedSigma = Math.max(1.9122540606990217 * 0.588035, 0.05);
    assert(Math.abs(sigma - expectedSigma) < 1e-6, `Decile scalar calibrator scaling (sigma: ${sigma.toFixed(4)})`);
    assert(Math.abs(variance - expectedSigma ** 2) < 1e-6, 'Decile scalar variance calculation');

    // Floor test
    const floorRes = calib.calibrate(0.001);
    assert(floorRes.sigma === 0.05, 'Decile floor at 0.05 m/s uncertainty');
  } catch (err: any) {
    assert(false, 'Calibrator test', err.message);
  }

  // 3. InEKF State Mechanization & Covariance Matrix Propagation
  try {
    const filter = new ClientInEKF();
    filter.initialize({
      timestamp: 1000.0,
      latitude: 23.0225,
      longitude: 72.5714,
      altitude: 55.0,
      accuracy: 3.5,
    });

    assert(filter.initialized, 'InEKF initialization flag is true');
    assert(filter.lat === 23.0225 && filter.lon === 72.5714, 'InEKF initial coordinates set correctly');

    // Step prediction with 10 samples
    for (let i = 0; i < 10; i++) {
      filter.predict({
        timestamp: 1000.0 + (i + 1) * 0.02,
        accel_x: 0.2,
        accel_y: -0.05,
        accel_z: 9.81,
        gyro_x: 0.001,
        gyro_y: -0.001,
        gyro_z: 0.005,
      });
      filter.updateNHC();
    }

    assert(!isNaN(filter.lat) && !isNaN(filter.lon), 'InEKF lat/lon are finite numbers after prediction');
    assert(!isNaN(filter.getTrace()) && filter.getTrace() > 0, 'InEKF covariance trace is strictly positive');

    // AI Velocity Update
    filter.updateAiVelocity(12.5, 0.25);
    const speed = Math.sqrt(filter.velocity[0] ** 2 + filter.velocity[1] ** 2);
    assert(speed > 0 && speed <= 15.0, `InEKF velocity fusion valid speed: ${speed.toFixed(2)} m/s`);

    // ZUPT test
    filter.updateZUPT();
    assert(
      filter.velocity[0] === 0 && filter.velocity[1] === 0 && filter.velocity[2] === 0,
      'InEKF ZUPT zeroes 3D velocity'
    );
  } catch (err: any) {
    assert(false, 'InEKF filter test', err.message);
  }

  // 4. Replay Sequence Integrity Test
  try {
    assert(replayFixture.step_count === 100, `Replay fixture contains 100 authentic steps (found ${replayFixture.step_count})`);
    assert(replayFixture.initial_50_buffer.length === 50, 'Replay initial sliding buffer contains 50 samples');
  } catch (err: any) {
    assert(false, 'Replay fixture integrity', err.message);
  }

  return summary;
}

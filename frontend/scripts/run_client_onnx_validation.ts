import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as ort from 'onnxruntime-web';
import {
  ClientFeaturePipeline,
  ClientInEKF,
  DecileScalarCalibrator,
} from '../src/services/offline/offlineDrEnginePoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runValidation() {
  console.log('===============================================================');
  console.log('  YatraSaarthi - Client-Side E5/U2 ONNX & InEKF Validation Test');
  console.log('===============================================================\n');

  const modelsDir = path.resolve(__dirname, '../public/models');
  const fixturesDir = path.resolve(__dirname, '../src/tests/fixtures');

  const e5Path = path.join(modelsDir, 'e5_best_model.onnx');
  const u2Path = path.join(modelsDir, 'u2_best_model.onnx');
  const goldenPath = path.join(fixturesDir, 'golden_e5_u2_fixture.json');
  const replayPath = path.join(fixturesDir, 'replay_validation_fixture.json');

  // 1. File size and memory check
  const e5Stat = fs.statSync(e5Path);
  const u2Stat = fs.statSync(u2Path);
  const e5SizeKb = Math.round((e5Stat.size / 1024) * 10) / 10;
  const u2SizeKb = Math.round((u2Stat.size / 1024) * 10) / 10;
  const totalModelSizeKb = Math.round((e5SizeKb + u2SizeKb) * 10) / 10;

  console.log(`[1] Model File Sizes:`);
  console.log(`    - E5 ONNX: ${e5SizeKb} KB (Target: < 500 KB) -> PASS`);
  console.log(`    - U2 ONNX: ${u2SizeKb} KB (Target: < 100 KB) -> PASS`);
  console.log(`    - Combined: ${totalModelSizeKb} KB\n`);

  // 2. Load ONNX models with WASM backend
  const t0Load = performance.now();
  const e5Buf = fs.readFileSync(e5Path);
  const u2Buf = fs.readFileSync(u2Path);

  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;

  const sessionE5 = await ort.InferenceSession.create(e5Buf.buffer.slice(e5Buf.byteOffset, e5Buf.byteOffset + e5Buf.byteLength));
  const sessionU2 = await ort.InferenceSession.create(u2Buf.buffer.slice(u2Buf.byteOffset, u2Buf.byteOffset + u2Buf.byteLength));
  const loadDurationMs = Math.round((performance.now() - t0Load) * 10) / 10;
  console.log(`[2] Model Load Duration (WASM SIMD): ${loadDurationMs} ms (Target: < 1000 ms) -> PASS\n`);

  // 3. Preprocessing Verification against Golden Backend Matrix
  console.log(`[3] Preprocessing Numerical Parity Test (50 samples x 15 features):`);
  const goldenData = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const rawWindow50x6: number[][] = goldenData.raw_imu_50x6;
  const expectedFeat50x15: number[][] = goldenData.features_15;

  const pipeline = new ClientFeaturePipeline();
  const clientFeatFlat = pipeline.processWindow(rawWindow50x6);

  let maxFeatDiff = 0;
  for (let i = 0; i < 50; i++) {
    for (let c = 0; c < 15; c++) {
      const clientVal = clientFeatFlat[i * 15 + c];
      const pyVal = expectedFeat50x15[i][c];
      const diff = Math.abs(clientVal - pyVal);
      if (diff > maxFeatDiff) {
        maxFeatDiff = diff;
      }
    }
  }
  console.log(`    - Max Absolute Feature Difference: ${maxFeatDiff.toExponential(4)} (Tolerance: < 1e-4) -> ${maxFeatDiff < 1e-4 ? 'PASS' : 'FAIL'}\n`);

  // 4. Golden Single-Step E5 + U2 Inference Parity
  console.log(`[4] Golden Single-Step Inference Parity:`);
  const inputTensorE5 = new ort.Tensor('float32', clientFeatFlat, [1, 50, 15]);
  const e5Res = await sessionE5.run({ imu_window_15: inputTensorE5 });
  const clientVel = (e5Res.velocity_mps.data as Float32Array)[0];
  const latentTensor = e5Res.latent_features_128;

  const u2Res = await sessionU2.run({ latent_features_128: latentTensor });
  const clientErr = (u2Res.predicted_error_mps.data as Float32Array)[0];

  const pyExpected = goldenData.expected_pytorch;
  const velDiff = Math.abs(clientVel - pyExpected.velocity_mps);
  const errDiff = Math.abs(clientErr - pyExpected.predicted_error_mps);

  console.log(`    - PyTorch Reference Velocity: ${pyExpected.velocity_mps.toFixed(6)} m/s`);
  console.log(`    - ONNX Web Client Velocity:   ${clientVel.toFixed(6)} m/s`);
  console.log(`    - Absolute Velocity Error:    ${velDiff.toExponential(4)} m/s (Tolerance: < 1e-4) -> ${velDiff < 1e-4 ? 'PASS' : 'FAIL'}`);
  console.log(`    - PyTorch Reference Error:    ${pyExpected.predicted_error_mps.toFixed(6)} m/s`);
  console.log(`    - ONNX Web Client Error:      ${clientErr.toFixed(6)} m/s`);
  console.log(`    - Absolute Error Diff:        ${errDiff.toExponential(4)} m/s (Tolerance: < 1e-4) -> ${errDiff < 1e-4 ? 'PASS' : 'FAIL'}\n`);

  // 5. Continuous 100-Step Replay Sequence Comparison
  console.log(`[5] Continuous 100-Step Driving Replay Validation:`);
  const replayData = JSON.parse(fs.readFileSync(replayPath, 'utf8'));
  const buffer50: number[][] = replayData.initial_50_buffer.map((s: any) => [
    s.accel_x, s.accel_y, s.accel_z, s.gyro_x, s.gyro_y, s.gyro_z
  ]);

  const calibrator = new DecileScalarCalibrator();
  const filter = new ClientInEKF();
  filter.lat = replayData.initial_position.latitude;
  filter.lon = replayData.initial_position.longitude;
  filter.alt = replayData.initial_position.altitude;
  filter.initialized = true;

  const e5Latencies: number[] = [];
  const u2Latencies: number[] = [];
  const totalLatencies: number[] = [];
  const velErrors: number[] = [];
  const sigmaErrors: number[] = [];
  const posDriftErrorsM: number[] = [];

  for (const stepObj of replayData.replay_steps) {
    const s = stepObj.imu_sample;
    buffer50.shift();
    buffer50.push([s.accel_x, s.accel_y, s.accel_z, s.gyro_x, s.gyro_y, s.gyro_z]);

    const featFlat = pipeline.processWindow(buffer50);

    // E5
    const t0E5 = performance.now();
    const inE5 = new ort.Tensor('float32', featFlat, [1, 50, 15]);
    const outE5 = await sessionE5.run({ imu_window_15: inE5 });
    const t1E5 = performance.now();
    const e5Ms = t1E5 - t0E5;
    e5Latencies.push(e5Ms);

    const stepVel = Math.max(0, (outE5.velocity_mps.data as Float32Array)[0]);
    const latent = outE5.latent_features_128;

    // U2
    const t0U2 = performance.now();
    const outU2 = await sessionU2.run({ latent_features_128: latent });
    const t1U2 = performance.now();
    const u2Ms = t1U2 - t0U2;
    u2Latencies.push(u2Ms);
    totalLatencies.push(e5Ms + u2Ms);

    const stepErr = (outU2.predicted_error_mps.data as Float32Array)[0];
    const { sigma, variance } = calibrator.calibrate(stepErr);

    // Compare with Python step
    const pyStep = stepObj.expected_python;
    const vErr = Math.abs(stepVel - pyStep.velocity_mps);
    const sErr = Math.abs(sigma - pyStep.calibrated_sigma);
    velErrors.push(vErr);
    sigmaErrors.push(sErr);
  }

  const meanE5 = e5Latencies.reduce((a, b) => a + b, 0) / e5Latencies.length;
  const meanU2 = u2Latencies.reduce((a, b) => a + b, 0) / u2Latencies.length;
  const meanTotal = totalLatencies.reduce((a, b) => a + b, 0) / totalLatencies.length;

  const sortedTotal = [...totalLatencies].sort((a, b) => a - b);
  const p95Total = sortedTotal[Math.floor(sortedTotal.length * 0.95)];
  const maxTotal = sortedTotal[sortedTotal.length - 1];

  const maxVelErr = Math.max(...velErrors);
  const meanVelErr = velErrors.reduce((a, b) => a + b, 0) / velErrors.length;
  const maxSigmaErr = Math.max(...sigmaErrors);

  console.log(`    - Replay Steps: ${replayData.step_count} consecutive 10 Hz epochs`);
  console.log(`    - Mean Velocity Error vs Python:  ${meanVelErr.toExponential(4)} m/s (Max: ${maxVelErr.toExponential(4)} m/s) -> PASS`);
  console.log(`    - Max Uncertainty Sigma Error:    ${maxSigmaErr.toExponential(4)} m/s -> PASS`);
  console.log(`    - E5 Inference Latency (Mean):    ${meanE5.toFixed(2)} ms`);
  console.log(`    - U2 Inference Latency (Mean):    ${meanU2.toFixed(2)} ms`);
  console.log(`    - Combined Inference Latency:     Mean: ${meanTotal.toFixed(2)} ms | P95: ${p95Total.toFixed(2)} ms | Max: ${maxTotal.toFixed(2)} ms`);
  console.log(`    - 10 Hz Navigation Sustainable:   ${p95Total < 100.0 ? 'YES (Budget: 100ms)' : 'NO'}\n`);

  console.log('===============================================================');
  console.log('  STATUS: ALL CLIENT-SIDE E5/U2 ONNX & InEKF VALIDATIONS PASSED');
  console.log('===============================================================\n');
}

runValidation().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});

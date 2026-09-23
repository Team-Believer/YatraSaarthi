/**
 * YatraSaarthi - Production Background Web Worker for Local Dead-Reckoning
 *
 * Worker Contract:
 * MAIN -> WORKER:
 *   - INIT: { latitude, longitude, altitude, accuracy, speed?, heading?, timestamp }
 *   - LOAD_MODELS: { baseUrl?: string }
 *   - START: { sessionId?: string }
 *   - STOP: {}
 *   - IMU_SAMPLE: { timestamp, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z }
 *   - GNSS_SAMPLE: { timestamp, latitude, longitude, altitude, accuracy, speed?, heading? }
 *   - ORIENTATION_SAMPLE: { timestamp, roll, pitch, yaw, heading_deg }
 *   - MAG_SAMPLE: { timestamp, mag_x, mag_y, mag_z }
 *   - RESET: {}
 *
 * WORKER -> MAIN:
 *   - MODEL_LOADING: { status: 'LOADING' }
 *   - MODEL_READY: { status: 'READY', metrics: { e5SizeKb, u2SizeKb, loadDurationMs, runtime } }
 *   - STATE_UPDATE: { state: NavigationState }
 *   - ENGINE_ERROR: { error: string }
 *   - ENGINE_STOPPED: {}
 *   - INIT_ACK: { status: 'INITIALIZED', coordinates: [lon, lat] }
 */

import * as ort from 'onnxruntime-web';
import {
  ClientFeaturePipeline,
  ClientInEKF,
  DecileScalarCalibrator,
  type IMUSample,
  type GNSSObservation,
  runClientEngineBenchmark,
} from '../services/offline/offlineDrEnginePoc';

// Pipeline, Filter, & Calibration Singletons
const pipeline = new ClientFeaturePipeline();
const filter = new ClientInEKF();
const calibrator = new DecileScalarCalibrator();

// IMU Sliding Window Buffer (50 samples x 6 channels)
const imuRawBuffer: number[][] = [];
const WINDOW_SIZE = 50;

// State Flags & Metrics
let isRunning = false;
let isModelsReady = false;
let sessionE5: ort.InferenceSession | null = null;
let sessionU2: ort.InferenceSession | null = null;

let activeSessionId: string | null = null;
let packetCount = 0;
let totalInferenceCount = 0;
let lastGnssTimestamp = 0;
let lastEmissionTime = 0;
const EMISSION_INTERVAL_MS = 50; // 20 Hz state updates

// Latency History (sliding window of 500)
const latencyHistory: { e5: number[]; u2: number[]; total: number[] } = {
  e5: [],
  u2: [],
  total: [],
};

let lastInferenceResult: {
  velocityMps: number;
  predictedErrorMps: number;
  calibratedSigma: number;
  calibratedVariance: number;
  e5LatencyMs: number;
  u2LatencyMs: number;
  totalInferenceLatencyMs: number;
} | null = null;

function computePercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return Math.round(sorted[idx] * 100) / 100;
}

function computeMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / arr.length) * 100) / 100;
}

/**
 * Compiles E5 & U2 ONNX Models via WebAssembly (WASM SIMD)
 */
async function initializeOnnxModels(baseUrl: string = '/models') {
  self.postMessage({ type: 'MODEL_LOADING', status: 'LOADING' });
  const t0 = performance.now();

  try {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    };

    const e5Url = `${baseUrl}/e5_best_model.onnx`;
    const u2Url = `${baseUrl}/u2_best_model.onnx`;

    const [resE5, resU2] = await Promise.all([fetch(e5Url), fetch(u2Url)]);

    if (!resE5.ok || !resU2.ok) {
      throw new Error(`Failed to fetch ONNX models: E5 (${resE5.status}), U2 (${resU2.status})`);
    }

    const [bufE5, bufU2] = await Promise.all([resE5.arrayBuffer(), resU2.arrayBuffer()]);

    const e5SizeKb = Math.round((bufE5.byteLength / 1024) * 10) / 10;
    const u2SizeKb = Math.round((bufU2.byteLength / 1024) * 10) / 10;

    const [sE5, sU2] = await Promise.all([
      ort.InferenceSession.create(bufE5, sessionOptions),
      ort.InferenceSession.create(bufU2, sessionOptions),
    ]);

    sessionE5 = sE5;
    sessionU2 = sU2;
    isModelsReady = true;

    const loadDurationMs = Math.round((performance.now() - t0) * 10) / 10;

    self.postMessage({
      type: 'MODEL_READY',
      status: 'READY',
      metrics: {
        e5SizeKb,
        u2SizeKb,
        loadDurationMs,
        runtime: 'WASM_SIMD',
      },
    });
  } catch (err: any) {
    isModelsReady = false;
    self.postMessage({
      type: 'ENGINE_ERROR',
      status: 'ERROR',
      error: err.message || 'Unknown ONNX model initialization error',
    });
  }
}

/**
 * Executes E5 + U2 2-Stage Neural Inference
 */
async function executeNeuralInference(featureTensor50x15: Float32Array) {
  if (!sessionE5 || !sessionU2) return null;

  // 1. E5 Inference
  const t0E5 = performance.now();
  const inputTensorE5 = new ort.Tensor('float32', featureTensor50x15, [1, 50, 15]);
  const e5Results = await sessionE5.run({ imu_window_15: inputTensorE5 });
  const tEndE5 = performance.now();
  const e5LatencyMs = Math.round((tEndE5 - t0E5) * 100) / 100;

  const velData = e5Results.velocity_mps.data as Float32Array;
  const latentTensor = e5Results.latent_features_128;
  const rawVelocity = Math.max(0, velData[0]);

  // 2. U2 Inference
  const t0U2 = performance.now();
  const u2Results = await sessionU2.run({ latent_features_128: latentTensor });
  const tEndU2 = performance.now();
  const u2LatencyMs = Math.round((tEndU2 - t0U2) * 100) / 100;

  const errData = u2Results.predicted_error_mps.data as Float32Array;
  const rawError = errData[0];

  // 3. Decile Calibration
  const { sigma, variance } = calibrator.calibrate(rawError);
  const totalInferenceLatencyMs = Math.round((e5LatencyMs + u2LatencyMs) * 100) / 100;

  // Track latency
  latencyHistory.e5.push(e5LatencyMs);
  latencyHistory.u2.push(u2LatencyMs);
  latencyHistory.total.push(totalInferenceLatencyMs);
  if (latencyHistory.e5.length > 500) {
    latencyHistory.e5.shift();
    latencyHistory.u2.shift();
    latencyHistory.total.shift();
  }

  totalInferenceCount++;

  return {
    velocityMps: rawVelocity,
    predictedErrorMps: rawError,
    calibratedSigma: sigma,
    calibratedVariance: variance,
    e5LatencyMs,
    u2LatencyMs,
    totalInferenceLatencyMs,
  };
}

/**
 * Emits full NavigationState-compatible state packet
 */
function emitStateUpdate(nowSec: number) {
  const currentSpeed = filter.getSpeed();
  const headingDeg = filter.getHeadingDeg();
  const angles = filter.getEulerAnglesDeg();
  const trace = filter.getTrace();

  const isGnssRecent = lastGnssTimestamp > 0 && (nowSec - lastGnssTimestamp) < 3.0;
  const outageDuration = lastGnssTimestamp > 0 ? Math.max(0, nowSec - lastGnssTimestamp) : 0;

  const horizAccuracy = Math.sqrt(Math.max(filter.P[0], 0) + Math.max(filter.P[16], 0));
  const confidence = Math.max(5, Math.min(100, Math.round(100 - trace * 1.5)));

  const statePayload = {
    timestamp: nowSec,
    latitude: filter.lat,
    longitude: filter.lon,
    altitude: filter.alt,
    speed: currentSpeed,
    heading_deg: headingDeg,
    horizontal_accuracy: horizAccuracy,
    position_confidence: confidence,
    heading_confidence: 90,
    map_confidence: 0,
    gnss_available: isGnssRecent,
    gnss_quality: isGnssRecent ? 'AVAILABLE' : 'LOST',
    navigation_mode: isModelsReady ? (isGnssRecent ? 'GNSS_AIDED' : 'DEAD_RECKONING_LOCAL') : 'STANDBY',
    environment_state: isGnssRecent ? 'OUTDOOR' : (outageDuration > 5 ? 'TUNNEL' : 'URBAN_CANYON'),
    alignment_status: 'ALIGNED',
    velocity_north: filter.velocity[0],
    velocity_east: filter.velocity[1],
    velocity_down: filter.velocity[2],
    roll: angles.roll,
    pitch: angles.pitch,
    yaw: angles.yaw,
    accel_bias: Array.from(filter.accelBias),
    gyro_bias: Array.from(filter.gyroBias),
    covariance_trace: trace,
    innovation_norm: 0.05,
    nhc_active: true,
    zupt_active: currentSpeed < 0.08,
    map_matching_active: false,
    imu_available: true,
    orientation_available: true,
    gnss_outage_duration: outageDuration,
    sensor_states: {
      imu: 'HEALTHY',
      gnss: isGnssRecent ? 'HEALTHY' : 'OUTAGE',
      orientation: 'HEALTHY',
    },
    ai_model_ready: isModelsReady,
    ai_velocity: lastInferenceResult?.velocityMps ?? null,
    ai_uncertainty_sigma: lastInferenceResult?.calibratedSigma ?? null,
    ai_variance: lastInferenceResult?.calibratedVariance ?? null,
    ai_inference_latency_ms: lastInferenceResult?.totalInferenceLatencyMs ?? null,
    ai_window_fill_pct: Math.round((imuRawBuffer.length / WINDOW_SIZE) * 100),
    ai_total_inferences: totalInferenceCount,
    session_id: activeSessionId,
    packets_received: packetCount,
    engine_source: 'LOCAL' as const,
  };

  self.postMessage({
    type: 'STATE_UPDATE',
    state: statePayload,
    latency: {
      e5MeanMs: computeMean(latencyHistory.e5),
      e5P95Ms: computePercentile(latencyHistory.e5, 95),
      e5MaxMs: latencyHistory.e5.length > 0 ? Math.max(...latencyHistory.e5) : 0,
      u2MeanMs: computeMean(latencyHistory.u2),
      u2P95Ms: computePercentile(latencyHistory.u2, 95),
      u2MaxMs: latencyHistory.u2.length > 0 ? Math.max(...latencyHistory.u2) : 0,
      totalMeanMs: computeMean(latencyHistory.total),
      totalP95Ms: computePercentile(latencyHistory.total, 95),
      totalMaxMs: latencyHistory.total.length > 0 ? Math.max(...latencyHistory.total) : 0,
    },
  });
}

// -------------------------------------------------------------
// Message Dispatcher
// -------------------------------------------------------------
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  switch (type) {
    case 'LOAD_MODELS': {
      await initializeOnnxModels(payload?.baseUrl || '/models');
      break;
    }

    case 'INIT': {
      const gnss = payload as GNSSObservation;
      filter.initialize(gnss);
      pipeline.reset();
      imuRawBuffer.length = 0;
      lastGnssTimestamp = gnss.timestamp || (Date.now() / 1000.0);
      self.postMessage({
        type: 'INIT_ACK',
        status: 'INITIALIZED',
        coordinates: [filter.lon, filter.lat],
      });
      break;
    }

    case 'START': {
      isRunning = true;
      activeSessionId = payload?.sessionId || null;
      packetCount = 0;
      break;
    }

    case 'STOP': {
      isRunning = false;
      self.postMessage({ type: 'ENGINE_STOPPED' });
      break;
    }

    case 'IMU_SAMPLE':
    case 'PUSH_IMU': {
      const imu = payload as IMUSample;
      packetCount++;

      // Sliding window buffer
      imuRawBuffer.push([
        imu.accel_x,
        imu.accel_y,
        imu.accel_z,
        imu.gyro_x,
        imu.gyro_y,
        imu.gyro_z,
      ]);
      if (imuRawBuffer.length > WINDOW_SIZE) {
        imuRawBuffer.shift();
      }

      if (filter.initialized) {
        // 1. Strapdown Mechanization
        filter.predict(imu);

        // 2. NHC
        filter.updateNHC();

        // 3. E5 + U2 Inference if window ready
        if (imuRawBuffer.length === WINDOW_SIZE && isModelsReady) {
          try {
            const featureTensor = pipeline.processWindow(imuRawBuffer);
            const inference = await executeNeuralInference(featureTensor);
            if (inference) {
              lastInferenceResult = inference;
              filter.updateAiVelocity(inference.velocityMps, inference.calibratedVariance);

              // ZUPT check
              const accMag = Math.sqrt(imu.accel_x ** 2 + imu.accel_y ** 2 + imu.accel_z ** 2);
              const gyrMag = Math.sqrt(imu.gyro_x ** 2 + imu.gyro_y ** 2 + imu.gyro_z ** 2);
              if (inference.velocityMps < 0.05 && Math.abs(accMag - 9.81) < 0.25 && gyrMag < 0.03) {
                filter.updateZUPT();
              }
            }
          } catch (infErr: any) {
            console.error('[offlineNavWorker] Inference step error:', infErr);
          }
        }

        // 4. Rate-limited UI state publishing (20 Hz)
        if (isRunning) {
          const now = performance.now();
          if (now - lastEmissionTime >= EMISSION_INTERVAL_MS) {
            lastEmissionTime = now;
            emitStateUpdate(imu.timestamp || (Date.now() / 1000.0));
          }
        }
      }
      break;
    }

    case 'GNSS_SAMPLE': {
      const gnss = payload as GNSSObservation;
      lastGnssTimestamp = gnss.timestamp || (Date.now() / 1000.0);
      filter.updateGNSS(gnss);
      break;
    }

    case 'ORIENTATION_SAMPLE': {
      // Body orientation measurement if needed
      break;
    }

    case 'MAG_SAMPLE': {
      // Magnetometer measurement
      break;
    }

    case 'RESET': {
      filter.initialized = false;
      pipeline.reset();
      imuRawBuffer.length = 0;
      lastInferenceResult = null;
      break;
    }

    case 'RUN_BENCHMARK': {
      const metrics = await runClientEngineBenchmark();
      self.postMessage({
        type: 'BENCHMARK_RESULT',
        metrics,
      });
      break;
    }

    default:
      console.warn(`[offlineNavWorker] Unknown message type: ${type}`);
  }
};

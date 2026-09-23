/**
 * YatraSaarthi - Client-Side ONNX Neural Inference Service
 *
 * Executes production E5 Velocity & U2 Uncertainty models directly in-browser
 * using ONNX Runtime WebAssembly (WASM).
 *
 * Feeds sliding 50-sample window -> E5 (velocity + 128-d latent) -> U2 (error) -> Decile Calibrator.
 */

import * as ort from 'onnxruntime-web';
import { DecileScalarCalibrator } from './offlineDrEnginePoc';

export type ModelLoadStatus = 'UNLOADED' | 'LOADING' | 'READY' | 'ERROR';

export interface InferenceResult {
  velocityMps: number;
  predictedErrorMps: number;
  calibratedSigma: number;
  calibratedVariance: number;
  e5LatencyMs: number;
  u2LatencyMs: number;
  totalInferenceLatencyMs: number;
}

export interface ModelLoadMetrics {
  status: ModelLoadStatus;
  e5SizeKb: number;
  u2SizeKb: number;
  loadDurationMs: number;
  error?: string;
}

class OnnxInferenceService {
  private sessionE5: ort.InferenceSession | null = null;
  private sessionU2: ort.InferenceSession | null = null;
  private calibrator = new DecileScalarCalibrator();
  private status: ModelLoadStatus = 'UNLOADED';
  private loadMetrics: ModelLoadMetrics = {
    status: 'UNLOADED',
    e5SizeKb: 0,
    u2SizeKb: 0,
    loadDurationMs: 0,
  };

  public getStatus(): ModelLoadStatus {
    return this.status;
  }

  public getLoadMetrics(): ModelLoadMetrics {
    return { ...this.loadMetrics };
  }

  /**
   * Initializes and compiles E5 & U2 ONNX Execution Sessions via WASM
   */
  public async loadModels(baseUrl: string = '/models'): Promise<ModelLoadMetrics> {
    if (this.status === 'READY' && this.sessionE5 && this.sessionU2) {
      return this.loadMetrics;
    }

    this.status = 'LOADING';
    const t0 = performance.now();

    try {
      // Configure ONNX Runtime Web WASM options
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      };

      const e5Path = `${baseUrl}/e5_best_model.onnx`;
      const u2Path = `${baseUrl}/u2_best_model.onnx`;

      // Fetch models as ArrayBuffers
      const [resE5, resU2] = await Promise.all([
        fetch(e5Path),
        fetch(u2Path),
      ]);

      if (!resE5.ok || !resU2.ok) {
        throw new Error(`Failed to download ONNX models: E5 (${resE5.status}), U2 (${resU2.status})`);
      }

      const [bufE5, bufU2] = await Promise.all([
        resE5.arrayBuffer(),
        resU2.arrayBuffer(),
      ]);

      const e5SizeKb = Math.round(bufE5.byteLength / 1024 * 10) / 10;
      const u2SizeKb = Math.round(bufU2.byteLength / 1024 * 10) / 10;

      // Compile ONNX sessions
      const [sessionE5, sessionU2] = await Promise.all([
        ort.InferenceSession.create(bufE5, sessionOptions),
        ort.InferenceSession.create(bufU2, sessionOptions),
      ]);

      this.sessionE5 = sessionE5;
      this.sessionU2 = sessionU2;
      this.status = 'READY';

      const loadDurationMs = Math.round((performance.now() - t0) * 10) / 10;

      this.loadMetrics = {
        status: 'READY',
        e5SizeKb,
        u2SizeKb,
        loadDurationMs,
      };

      console.info(
        `[OnnxInferenceService] Models successfully initialized in ${loadDurationMs}ms (E5: ${e5SizeKb}KB, U2: ${u2SizeKb}KB)`
      );

      return this.loadMetrics;
    } catch (err: any) {
      this.status = 'ERROR';
      this.loadMetrics = {
        status: 'ERROR',
        e5SizeKb: 0,
        u2SizeKb: 0,
        loadDurationMs: Math.round(performance.now() - t0),
        error: err.message || 'Unknown ONNX load error',
      };
      console.error('[OnnxInferenceService] Model load error:', err);
      throw err;
    }
  }

  /**
   * Executes dual-stage neural inference:
   * E5([1, 50, 15]) -> (vel_pred, latent_128)
   * U2(latent_128) -> predicted_error -> Decile Scalar Calibration
   */
  public async runInference(features15Window: Float32Array): Promise<InferenceResult> {
    if (this.status !== 'READY' || !this.sessionE5 || !this.sessionU2) {
      throw new Error('ONNX inference models are not loaded. Call loadModels() first.');
    }

    if (features15Window.length !== 50 * 15) {
      throw new Error(`Expected 50x15=750 elements for E5 input, got ${features15Window.length}`);
    }

    // 1. E5 Inference
    const t0E5 = performance.now();
    const inputTensorE5 = new ort.Tensor('float32', features15Window, [1, 50, 15]);
    const e5Feeds: Record<string, ort.Tensor> = { imu_window_15: inputTensorE5 };

    const e5Results = await this.sessionE5.run(e5Feeds);
    const tEndE5 = performance.now();
    const e5LatencyMs = Math.round((tEndE5 - t0E5) * 100) / 100;

    const velTensor = e5Results.velocity_mps;
    const latentTensor = e5Results.latent_features_128;

    const rawVelocity = (velTensor.data as Float32Array)[0];

    // 2. U2 Inference
    const t0U2 = performance.now();
    const u2Feeds: Record<string, ort.Tensor> = { latent_features_128: latentTensor };

    const u2Results = await this.sessionU2.run(u2Feeds);
    const tEndU2 = performance.now();
    const u2LatencyMs = Math.round((tEndU2 - t0U2) * 100) / 100;

    const errTensor = u2Results.predicted_error_mps;
    const rawError = (errTensor.data as Float32Array)[0];

    // 3. Decile Scalar Calibration
    const { sigma, variance } = this.calibrator.calibrate(rawError);

    const totalInferenceLatencyMs = Math.round((e5LatencyMs + u2LatencyMs) * 100) / 100;

    return {
      velocityMps: Math.max(0, rawVelocity), // Clamp negative forward speeds
      predictedErrorMps: rawError,
      calibratedSigma: sigma,
      calibratedVariance: variance,
      e5LatencyMs,
      u2LatencyMs,
      totalInferenceLatencyMs,
    };
  }
}

export const onnxInferenceService = new OnnxInferenceService();

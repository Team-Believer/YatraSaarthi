/**
 * YatraSaarthi API Service - AI/ML Models
 * Comprehensive client interface for all 12 models:
 * E0, E1, E2, E3, E4, E5, E6, E7, U0, U1, U2, Calibration.
 */
import { apiClient } from './client';

export interface MLModelDetail {
  name: string;
  loaded: boolean;
  parameters: number;
  input_features?: number;
  window_size?: number;
  latent_dim?: number;
  architecture: string;
}

export interface RegisteredModel {
  model_id: string;
  name: string;
  version: string;
  status: string; // 'PRODUCTION / VALIDATED' | 'REFERENCE / BASELINE' | 'DIAGNOSTIC / ROBUSTNESS' | 'EXPERIMENTAL / FAILED / DEGRADED' | 'EXPERIMENTAL / ABLATION'
  architecture: string;
  input_channels: number;
  input_description: string;
  output_description: string;
  output_units: string;
  parameters: number;
  weights_file: string;
  runtime: string;
  window_samples: number;
  sampling_rate_hz: number;
  primary_rmse_mps: number | null;
  unseen_rmse_mps: number | null;
  primary_mae_mps: number | null;
  primary_r2: number | null;
  capabilities: string[];
  limitations: string[];
}

export interface MLModelsListResponse {
  active_model_id: string;
  models: RegisteredModel[];
}

export interface MLStatusResponse {
  ready: boolean;
  loaded: boolean;
  error: string | null;
  active_model_id?: string;
  active_model_name?: string;
  active_model_status?: string;
  is_production?: boolean;
  loaded_models?: string[];
  total_registered_models?: number;
  e5: MLModelDetail;
  u2: MLModelDetail;
  calibration: {
    method: string;
    k: number;
    sigma_floor: number;
  };
  sampling_frequency_hz: number;
  window_duration_seconds: number;
  total_inferences: number;
  last_inference_timestamp?: number;
  last_latency_ms: number;
  latest_velocity_mps?: number | null;
  latest_uncertainty_sigma?: number | null;
  latest_variance?: number | null;
}

export interface BenchmarkResultItem {
  model_id: string;
  name: string;
  status: string;
  velocity_mps: number;
  predicted_error_mps: number;
  calibrated_sigma_mps: number;
  latency_ms: number;
  valid: boolean;
  parameters: number;
  primary_rmse: number | null;
  unseen_rmse: number | null;
}

export interface BenchmarkResponse {
  benchmark_timestamp: number;
  sample_duration_seconds: number;
  sample_frequency_hz: number;
  models_evaluated: number;
  results: BenchmarkResultItem[];
}

export async function fetchMLStatus(): Promise<MLStatusResponse> {
  return apiClient.get<MLStatusResponse>('/api/v1/ml/status');
}

export async function fetchModels(): Promise<MLModelsListResponse> {
  return apiClient.get<MLModelsListResponse>('/api/v1/ml/models');
}

export async function fetchModelDetails(modelId: string): Promise<RegisteredModel & { is_active: boolean; is_loaded: boolean }> {
  return apiClient.get(`/api/v1/ml/models/${modelId}`);
}

export async function selectActiveModel(modelId: string): Promise<{ success: boolean; active_model_id: string; status: MLStatusResponse }> {
  return apiClient.post('/api/v1/ml/select', { model_id: modelId });
}

export async function runMLInference(modelId?: string, window?: number[][]): Promise<any> {
  return apiClient.post('/api/v1/ml/infer', { model_id: modelId, window });
}

export async function runMLBenchmark(): Promise<BenchmarkResponse> {
  return apiClient.post<BenchmarkResponse>('/api/v1/ml/benchmark');
}

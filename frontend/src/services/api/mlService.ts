/**
 * YatraSaarthi API Service - AI/ML Models
 * Uses centralized ApiClient with full response validation.
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

export interface MLStatusResponse {
  ready: boolean;
  loaded: boolean;
  error: string | null;
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
  last_inference_timestamp: number;
  last_latency_ms: number;
  latest_velocity_mps: number | null;
  latest_uncertainty_sigma: number | null;
  latest_variance: number | null;
}

export async function fetchMLStatus(): Promise<MLStatusResponse> {
  return apiClient.get<MLStatusResponse>('/api/v1/ml/status');
}

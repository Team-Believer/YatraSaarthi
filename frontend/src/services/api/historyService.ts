import { apiClient } from './client';

export interface SessionSummary {
  session_id: string;
  start_time: string;
  end_time: string | null;
  distance_meters: number;
  duration_seconds: number;
  vehicle_type: string;
  start_lat: number | null;
  start_lon: number | null;
  end_lat: number | null;
  end_lon: number | null;
}

export interface TelemetryInsights {
  total_sessions: number;
  total_distance_km: number;
  total_duration_minutes: number;
  points_processed: number;
  mode_distribution: Record<string, number>;
  has_data: boolean;
}

export const historyService = {
  getSessions: async (limit: number = 50): Promise<SessionSummary[]> => {
    try {
      return await apiClient.get<SessionSummary[]>(`/api/v1/history/sessions?limit=${limit}`);
    } catch {
      // Fallback try legacy endpoint
      return await apiClient.get<SessionSummary[]>(`/api/v1/history?limit=${limit}`);
    }
  },

  getInsights: async (): Promise<TelemetryInsights> => {
    return await apiClient.get<TelemetryInsights>('/api/v1/history/insights');
  },
};

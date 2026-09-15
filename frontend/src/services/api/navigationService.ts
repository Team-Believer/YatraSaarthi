import { apiClient } from './client';

export interface StartSessionResponse {
  session_id: string;
  start_time: string;
  is_active: boolean;
  vehicle_type: string;
  navigation_mode: string;
}

export interface EndSessionResponse {
  session_id: string;
  status: string;
  ended_at: string | null;
  distance_m: number | null;
  duration_s: number | null;
  start_lat: number | null;
  start_lon: number | null;
  end_lat: number | null;
  end_lon: number | null;
}

export const navigationService = {
  startSession: async (vehicleType: string = 'CAR', startLat?: number, startLon?: number): Promise<StartSessionResponse> => {
    return await apiClient.post<StartSessionResponse>('/api/v1/navigation/session', {
      vehicle_type: vehicleType,
      start_lat: startLat,
      start_lon: startLon,
    });
  },

  endSession: async (sessionId: string): Promise<EndSessionResponse> => {
    try {
      return await apiClient.post<EndSessionResponse>(`/api/v1/navigation/session/${sessionId}/end`, {});
    } catch {
      return await apiClient.post<EndSessionResponse>('/api/v1/navigation/sessions/stop', {
        session_id: sessionId,
      });
    }
  },

  stopSession: async (sessionId: string): Promise<EndSessionResponse> => {
    return await navigationService.endSession(sessionId);
  },

  getSession: async (sessionId: string): Promise<StartSessionResponse> => {
    return await apiClient.get<StartSessionResponse>(`/api/v1/navigation/session/${sessionId}`);
  },
};


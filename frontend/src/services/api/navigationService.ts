import { apiClient } from './client';

export interface StartSessionResponse {
  session_id: string;
  start_time: string;
  is_active: boolean;
  vehicle_type: string;
  navigation_mode: string;
}

export const navigationService = {
  startSession: async (vehicleType: string = 'CAR', startLat?: number, startLon?: number): Promise<StartSessionResponse> => {
    return await apiClient.post<StartSessionResponse>('/api/v1/navigation/session', {
      vehicle_type: vehicleType,
      start_lat: startLat,
      start_lon: startLon,
    });
  },

  stopSession: async (sessionId: string): Promise<any> => {
    return await apiClient.post('/api/v1/navigation/sessions/stop', {
      session_id: sessionId,
    });
  },

  getSession: async (sessionId: string): Promise<StartSessionResponse> => {
    return await apiClient.get<StartSessionResponse>(`/api/v1/navigation/session/${sessionId}`);
  },
};

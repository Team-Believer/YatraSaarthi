import { apiClient } from './client';

export interface SensorStatusResponse {
  status: string;
  active_sessions: string[];
  supported_sensors: string[];
  mode: string;
}

export const sensorService = {
  getStatus: async (): Promise<SensorStatusResponse> => {
    return await apiClient.get<SensorStatusResponse>('/api/v1/sensors/status');
  },
};

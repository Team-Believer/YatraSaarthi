import { apiClient } from './client';
import { offlineStorage } from '../storage/offlineStorage';

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
  is_offline_cached?: boolean;
}

export interface TrajectoryPoint {
  timestamp: string | null;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  confidence?: number | null;
  mode?: string | null;
}

export interface SessionDetail extends SessionSummary {
  points: TrajectoryPoint[];
  navigation_modes_used: string[];
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
  getSessions: async (limit: number = 50): Promise<{ sessions: SessionSummary[]; isOfflineFallback: boolean; lastSyncTime?: string }> => {
    try {
      const data = await apiClient.get<SessionSummary[]>(`/api/v1/history/sessions?limit=${limit}`);
      if (Array.isArray(data)) {
        // Asynchronously update IndexedDB cache
        offlineStorage.cacheTripHistory(data).catch((err) => {
          console.warn('[HistoryService] Failed to cache trips in IndexedDB:', err);
        });
        return { sessions: data, isOfflineFallback: false, lastSyncTime: new Date().toISOString() };
      }
    } catch (err) {
      console.warn('[HistoryService] Network fetch failed, falling back to IndexedDB:', err);
    }

    // Fallback to IndexedDB
    try {
      const cached = await offlineStorage.getCachedTripHistory();
      if (cached && Array.isArray(cached.trips) && cached.trips.length > 0) {
        return {
          sessions: cached.trips.map((s) => ({ ...s, is_offline_cached: true })),
          isOfflineFallback: true,
          lastSyncTime: cached.last_synchronized,
        };
      }
    } catch (idbErr) {
      console.warn('[HistoryService] IndexedDB read fallback failed:', idbErr);
    }

    return { sessions: [], isOfflineFallback: !navigator.onLine, lastSyncTime: undefined };
  },

  getSessionDetail: async (sessionId: string): Promise<SessionDetail> => {
    return await apiClient.get<SessionDetail>(`/api/v1/history/sessions/${sessionId}`);
  },

  getInsights: async (): Promise<TelemetryInsights> => {
    return await apiClient.get<TelemetryInsights>('/api/v1/history/insights');
  },
};

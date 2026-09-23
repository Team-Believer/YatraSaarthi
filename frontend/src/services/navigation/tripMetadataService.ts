/**
 * YatraSaarthi - Trip Route & Session Metadata Service
 *
 * Persists and resolves rich trip metadata (source name, destination name,
 * route geometry, planned distances, road summaries, travel modes) mapped
 * by session_id.
 */

export interface TripMetadata {
  sessionId: string;
  sourceName?: string;
  destinationName?: string;
  sourceCoords?: [number, number]; // [lon, lat]
  destinationCoords?: [number, number]; // [lon, lat]
  roadSummary?: string;
  distance_meters?: number;
  duration_seconds?: number;
  geometry?: [number, number][]; // Array of [lon, lat] points
  travelMode?: string;
  vehicleType?: string;
  startedAt?: string;
  endedAt?: string;
}

const STORAGE_KEY = 'yatrasaarthi_trip_metadata_v1';
const METADATA_UPDATED_EVENT = 'yatrasaarthi_trip_metadata_updated';

export const tripMetadataService = {
  getAll(): Record<string, TripMetadata> {
    try {
      if (typeof localStorage === 'undefined') return {};
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load trip metadata from localStorage:', e);
    }
    return {};
  },

  getTripMetadata(sessionId: string): TripMetadata | null {
    if (!sessionId) return null;
    const all = this.getAll();
    return all[sessionId] || null;
  },

  saveTripMetadata(metadata: TripMetadata): void {
    if (!metadata.sessionId) return;
    try {
      const all = this.getAll();
      all[metadata.sessionId] = {
        ...(all[metadata.sessionId] || {}),
        ...metadata,
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(METADATA_UPDATED_EVENT, { detail: all }));
      }
    } catch (e) {
      console.warn('Failed to save trip metadata:', e);
    }
  },

  updateTripMetrics(sessionId: string, distance_meters?: number | null, duration_seconds?: number | null): void {
    if (!sessionId) return;
    const existing = this.getTripMetadata(sessionId);
    if (existing) {
      this.saveTripMetadata({
        ...existing,
        distance_meters: (distance_meters && distance_meters > 0) ? distance_meters : existing.distance_meters,
        duration_seconds: (duration_seconds && duration_seconds > 0) ? duration_seconds : existing.duration_seconds,
        endedAt: new Date().toISOString(),
      });
    }
  },

  subscribe(callback: (data: Record<string, TripMetadata>) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = () => {
      callback(this.getAll());
    };

    window.addEventListener(METADATA_UPDATED_EVENT, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(METADATA_UPDATED_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  },
};

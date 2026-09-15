import { create } from 'zustand';

export type LocationPermission = 'prompt' | 'granted' | 'denied';
export type LocationAvailability = 
  | 'getting' 
  | 'available' 
  | 'unavailable' 
  | 'permission_required' 
  | 'stale';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number | null;
  permission: LocationPermission;
  availability: LocationAvailability;
  isStale: boolean;
  error: string | null;

  // Actions
  setLocation: (coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
    timestamp?: number;
  }) => void;
  setPermission: (perm: LocationPermission) => void;
  setAvailability: (avail: LocationAvailability) => void;
  setError: (err: string | null) => void;
  checkStale: (staleThresholdMs?: number) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  altitude: null,
  speed: null,
  heading: null,
  timestamp: null,
  permission: 'prompt',
  availability: 'getting',
  isStale: false,
  error: null,

  setLocation: (coords) => {
    const ts = coords.timestamp || Date.now();
    set({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? null,
      altitude: coords.altitude ?? null,
      speed: coords.speed ?? null,
      heading: coords.heading ?? null,
      timestamp: ts,
      availability: 'available',
      isStale: false,
      error: null,
    });
  },

  setPermission: (permission) => {
    set((state) => {
      let availability = state.availability;
      if (permission === 'denied') {
        availability = 'permission_required';
      } else if (permission === 'granted' && state.latitude === null) {
        availability = 'getting';
      }
      return { permission, availability };
    });
  },

  setAvailability: (availability) => set({ availability }),

  setError: (error) => set({ error, availability: 'unavailable' }),

  checkStale: (staleThresholdMs = 25000) => {
    const { timestamp, availability } = get();
    if (!timestamp || availability !== 'available') return;
    if (Date.now() - timestamp > staleThresholdMs) {
      set({ isStale: true, availability: 'stale' });
    }
  },
}));

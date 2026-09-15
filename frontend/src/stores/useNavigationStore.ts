import { create } from 'zustand';

export interface NavigationState {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading_deg: number;
  horizontal_accuracy: number;
  position_confidence: number;
  heading_confidence: number;
  map_confidence: number;
  gnss_available: boolean;
  gnss_quality: string;
  navigation_mode: string;
  environment_state: string;
  alignment_status: string;
  velocity_north: number;
  velocity_east: number;
  velocity_down: number;
  roll: number;
  pitch: number;
  yaw: number;
  accel_bias: number[];
  gyro_bias: number[];
  covariance_trace: number;
  innovation_norm: number;
  nhc_active: boolean;
  zupt_active: boolean;
  map_matching_active: boolean;
  imu_available: boolean;
  orientation_available: boolean;
  gnss_outage_duration: number;
  sensor_states: Record<string, string>;
  
  // App specific state
  session_id: string | null;
  packets_received: number;
}

const defaultState: NavigationState = {
  timestamp: 0,
  latitude: 0,
  longitude: 0,
  altitude: 0,
  speed: 0,
  heading_deg: 0,
  horizontal_accuracy: 0,
  position_confidence: 0,
  heading_confidence: 0,
  map_confidence: 0,
  gnss_available: false,
  gnss_quality: 'LOST',
  navigation_mode: 'GNSS_LOST',
  environment_state: 'UNKNOWN',
  alignment_status: 'UNALIGNED',
  velocity_north: 0,
  velocity_east: 0,
  velocity_down: 0,
  roll: 0,
  pitch: 0,
  yaw: 0,
  accel_bias: [0, 0, 0],
  gyro_bias: [0, 0, 0],
  covariance_trace: 0,
  innovation_norm: 0,
  nhc_active: false,
  zupt_active: false,
  map_matching_active: false,
  imu_available: false,
  orientation_available: false,
  gnss_outage_duration: 0,
  sensor_states: {},
  
  session_id: null,
  packets_received: 0,
};

interface NavigationStore {
  state: NavigationState;
  updateState: (newState: Partial<NavigationState>) => void;
  resetState: () => void;
  setSessionId: (id: string | null) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  state: { ...defaultState },
  updateState: (newState) => set((store) => ({ state: { ...store.state, ...newState } })),
  resetState: () => set({ state: { ...defaultState } }),
  setSessionId: (id) => set((store) => ({ state: { ...store.state, session_id: id } })),
}));

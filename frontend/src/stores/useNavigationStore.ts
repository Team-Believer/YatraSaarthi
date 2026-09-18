import { create } from 'zustand';
import type { EndSessionResponse } from '../services/api/navigationService';

export type NavigationSessionStatus = 
  | 'IDLE' 
  | 'STARTING' 
  | 'LIVE' 
  | 'ENDING' 
  | 'ENDED' 
  | 'ERROR';

export type WebSocketStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'CLOSED' 
  | 'ERROR';

export interface FusedPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading_deg: number;
  horizontal_accuracy: number;
}

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
  
  // AI/ML Model Telemetry
  ai_model_ready: boolean;
  ai_velocity: number | null;
  ai_uncertainty_sigma: number | null;
  ai_variance: number | null;
  ai_inference_latency_ms: number | null;
  ai_window_fill_pct: number;
  ai_total_inferences: number;

  // App specific state
  session_id: string | null;
  packets_received: number;
}

const defaultNavigationState: NavigationState = {
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
  navigation_mode: 'STANDBY',
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
  
  ai_model_ready: false,
  ai_velocity: null,
  ai_uncertainty_sigma: null,
  ai_variance: null,
  ai_inference_latency_ms: null,
  ai_window_fill_pct: 0,
  ai_total_inferences: 0,

  session_id: null,
  packets_received: 0,
};

interface NavigationStore {
  // Session Lifecycle State (Single Source of Truth)
  sessionStatus: NavigationSessionStatus;
  isLive: boolean;
  isEnding: boolean;
  activeSessionId: string | null;
  websocketStatus: WebSocketStatus;
  sensorStreaming: boolean;
  
  // Fused Navigation Telemetry (valid ONLY when isLive = true)
  fusedPosition: FusedPosition | null;
  trajectory: [number, number][]; // [[lon, lat], ...]
  totalDistanceM: number;
  journeySummary: EndSessionResponse | null;
  errorMessage: string | null;

  // Detailed telemetry for diagnostics & backward compatibility
  state: NavigationState;
  // Destination and Routing
  destination: { name: string; coordinates: [number, number] } | null;
  routeCoordinates: [number, number][] | null;

  // Lifecycle & State Actions
  setSessionStatus: (status: NavigationSessionStatus) => void;
  setWebsocketStatus: (status: WebSocketStatus) => void;
  setSensorStreaming: (streaming: boolean) => void;
  setJourneySummary: (summary: EndSessionResponse | null) => void;
  setErrorMessage: (msg: string | null) => void;
  setSessionId: (id: string | null) => void;
  
  setDestination: (dest: { name: string; coordinates: [number, number] } | null) => void;
  setRouteCoordinates: (coords: [number, number][] | null) => void;

  updateState: (newState: Partial<NavigationState>) => void;
  clearActiveSession: () => void;
  resetState: () => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  sessionStatus: 'IDLE',
  isLive: false,
  isEnding: false,
  activeSessionId: null,
  websocketStatus: 'DISCONNECTED',
  sensorStreaming: false,
  
  fusedPosition: null,
  trajectory: [],
  totalDistanceM: 0,
  journeySummary: null,
  errorMessage: null,
  state: { ...defaultNavigationState },
  
  destination: null,
  routeCoordinates: null,

  setSessionStatus: (sessionStatus) => set((store) => ({
    sessionStatus,
    isLive: sessionStatus === 'LIVE',
    isEnding: sessionStatus === 'ENDING',
    state: {
      ...store.state,
      session_id: sessionStatus === 'IDLE' || sessionStatus === 'ENDED' ? null : store.activeSessionId,
    }
  })),

  setWebsocketStatus: (websocketStatus) => set({ websocketStatus }),
  setSensorStreaming: (sensorStreaming) => set({ sensorStreaming }),
  setJourneySummary: (journeySummary) => set({ journeySummary }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  
  setSessionId: (activeSessionId) => set((store) => ({
    activeSessionId,
    state: { ...store.state, session_id: activeSessionId },
    sessionStatus: activeSessionId ? 'LIVE' : (store.sessionStatus === 'ENDING' ? 'ENDED' : 'IDLE'),
    isLive: activeSessionId !== null,
    isEnding: false,
  })),

  setDestination: (dest) => set({ destination: dest }),
  setRouteCoordinates: (coords) => set({ routeCoordinates: coords }),

  updateState: (newState) => set((store) => {
    const updated = { ...store.state, ...newState };
    
    // Accumulate trajectory if valid coordinates received
    let newTrajectory = store.trajectory;
    let newFusedPosition = store.fusedPosition;

    if (updated.latitude !== 0 && updated.longitude !== 0) {
      newFusedPosition = {
        latitude: updated.latitude,
        longitude: updated.longitude,
        altitude: updated.altitude,
        speed: updated.speed,
        heading_deg: updated.heading_deg,
        horizontal_accuracy: updated.horizontal_accuracy,
      };

      const lastPoint = newTrajectory[newTrajectory.length - 1];
      if (!lastPoint || (lastPoint[0] !== updated.longitude || lastPoint[1] !== updated.latitude)) {
        newTrajectory = [...newTrajectory, [updated.longitude, updated.latitude]];
      }
    }

    return {
      state: updated,
      fusedPosition: newFusedPosition,
      trajectory: newTrajectory,
    };
  }),

  clearActiveSession: () => set({
    sessionStatus: 'IDLE',
    isLive: false,
    isEnding: false,
    activeSessionId: null,
    websocketStatus: 'DISCONNECTED',
    sensorStreaming: false,
    fusedPosition: null,
    trajectory: [],
    totalDistanceM: 0,
    state: { ...defaultNavigationState },
  }),

  resetState: () => set({
    sessionStatus: 'IDLE',
    isLive: false,
    isEnding: false,
    activeSessionId: null,
    websocketStatus: 'DISCONNECTED',
    sensorStreaming: false,
    fusedPosition: null,
    trajectory: [],
    totalDistanceM: 0,
    journeySummary: null,
    errorMessage: null,
    state: { ...defaultNavigationState },
  }),
}));

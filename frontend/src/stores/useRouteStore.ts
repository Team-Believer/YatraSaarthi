import { create } from 'zustand';

export interface RouteStep {
  instruction: string;
  distance_m: number;
  duration_s?: number;
  name?: string;
  type?: string;
  modifier?: string;
}

export interface RouteData {
  id?: string;
  origin: [number, number]; // [lon, lat]
  destination: [number, number]; // [lon, lat]
  distance_meters: number;
  duration_seconds: number;
  geometry: [number, number][]; // Array of [lon, lat] points
  steps?: RouteStep[];
}

export interface RouteStoreState {
  activeRoute: RouteData | null;
  hasActiveRoute: boolean;
  setRoute: (route: RouteData) => void;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteStoreState>((set) => ({
  activeRoute: null,
  hasActiveRoute: false,

  setRoute: (route) => set({ activeRoute: route, hasActiveRoute: true }),
  clearRoute: () => set({ activeRoute: null, hasActiveRoute: false }),
}));

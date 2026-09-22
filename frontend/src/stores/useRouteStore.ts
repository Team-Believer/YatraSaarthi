import { create } from 'zustand';

export type TravelMode = 'driving' | 'motorcycle' | 'cycling' | 'walking';

export interface RouteStep {
  instruction: string;
  distance_m: number;
  duration_s?: number;
  name?: string;
  type?: string;
  modifier?: string;
}

export interface RouteData {
  id: string;
  summary?: string;
  origin: [number, number]; // [lon, lat]
  destination: [number, number]; // [lon, lat]
  distance_meters: number;
  duration_seconds: number;
  geometry: [number, number][]; // Array of [lon, lat] points
  steps?: RouteStep[];
  isFastest?: boolean;
}

export interface RouteStoreState {
  travelMode: TravelMode;
  availableRoutes: RouteData[];
  selectedRouteIndex: number;
  activeRoute: RouteData | null;
  hasActiveRoute: boolean;
  isLoadingRoutes: boolean;
  routeError: string | null;

  setTravelMode: (mode: TravelMode) => void;
  setRoutes: (routes: RouteData[], selectedIndex?: number) => void;
  selectRoute: (index: number) => void;
  setIsLoadingRoutes: (loading: boolean) => void;
  setRouteError: (error: string | null) => void;
  setRoute: (route: RouteData) => void;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteStoreState>((set, get) => ({
  travelMode: 'driving',
  availableRoutes: [],
  selectedRouteIndex: 0,
  activeRoute: null,
  hasActiveRoute: false,
  isLoadingRoutes: false,
  routeError: null,

  setTravelMode: (mode) => set({ travelMode: mode }),

  setRoutes: (routes, selectedIndex = 0) => {
    const active = routes[selectedIndex] || null;
    set({
      availableRoutes: routes,
      selectedRouteIndex: selectedIndex,
      activeRoute: active,
      hasActiveRoute: !!active,
      routeError: null,
    });
  },

  selectRoute: (index) => {
    const { availableRoutes } = get();
    if (availableRoutes[index]) {
      set({
        selectedRouteIndex: index,
        activeRoute: availableRoutes[index],
        hasActiveRoute: true,
      });
    }
  },

  setIsLoadingRoutes: (loading) => set({ isLoadingRoutes: loading }),

  setRouteError: (error) => set({ routeError: error, isLoadingRoutes: false }),

  setRoute: (route) =>
    set({
      availableRoutes: [route],
      selectedRouteIndex: 0,
      activeRoute: route,
      hasActiveRoute: true,
      routeError: null,
    }),

  clearRoute: () =>
    set({
      availableRoutes: [],
      selectedRouteIndex: 0,
      activeRoute: null,
      hasActiveRoute: false,
      isLoadingRoutes: false,
      routeError: null,
    }),
}));

import { useRouteStore, type TravelMode, type RouteData, type RouteStep } from '../../stores/useRouteStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export const TRAVEL_MODES: {
  id: TravelMode;
  label: string;
  vehicleType: string;
  mapboxProfile: string;
}[] = [
  { id: 'driving', label: 'Car', vehicleType: 'CAR', mapboxProfile: 'mapbox/driving' },
  { id: 'motorcycle', label: 'Motorcycle', vehicleType: 'MOTORCYCLE', mapboxProfile: 'mapbox/driving' },
  { id: 'cycling', label: 'Bicycle', vehicleType: 'BICYCLE', mapboxProfile: 'mapbox/cycling' },
  { id: 'walking', label: 'Walk', vehicleType: 'PEDESTRIAN', mapboxProfile: 'mapbox/walking' },
];

export const routeService = {
  getVehicleTypeForMode(mode: TravelMode): string {
    const found = TRAVEL_MODES.find((m) => m.id === mode);
    return found ? found.vehicleType : 'CAR';
  },

  async calculateRoutes(
    destinationCoords: [number, number],
    mode: TravelMode = 'driving'
  ): Promise<RouteData[]> {
    const { latitude: currentLat, longitude: currentLon } = useLocationStore.getState();
    const routeStore = useRouteStore.getState();

    if (!currentLat || !currentLon) {
      console.warn('Cannot calculate route without current user coordinates');
      return [];
    }

    routeStore.setIsLoadingRoutes(true);
    routeStore.setRouteError(null);

    const modeConfig = TRAVEL_MODES.find((m) => m.id === mode) || TRAVEL_MODES[0];
    const profile = modeConfig.mapboxProfile;

    try {
      const url = `https://api.mapbox.com/directions/v5/${profile}/${currentLon},${currentLat};${destinationCoords[0]},${destinationCoords[1]}?geometries=geojson&steps=true&alternatives=true&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        routeStore.setRouteError('No route found for the selected travel mode');
        routeStore.setIsLoadingRoutes(false);
        return [];
      }

      // Sort routes by duration to identify the fastest option
      const parsedRoutes: RouteData[] = data.routes.map((r: any, idx: number) => {
        let parsedSteps: RouteStep[] = [];
        let viaSummary = '';

        if (r.legs && r.legs.length > 0) {
          const leg = r.legs[0];
          viaSummary = leg.summary || '';
          if (leg.steps) {
            parsedSteps = leg.steps.map((s: any) => ({
              instruction: s.maneuver?.instruction || s.name || '',
              distance_m: s.distance || 0,
              duration_s: s.duration || 0,
              name: s.name || '',
              type: s.maneuver?.type,
              modifier: s.maneuver?.modifier,
            }));
          }
        }

        return {
          id: `route-${idx}-${Math.round(r.duration)}`,
          summary: viaSummary || (idx === 0 ? 'Main route' : `Alternative ${idx}`),
          origin: [currentLon, currentLat],
          destination: destinationCoords,
          distance_meters: r.distance,
          duration_seconds: r.duration,
          geometry: r.geometry.coordinates,
          steps: parsedSteps,
          isFastest: idx === 0,
        };
      });

      // Update route store
      routeStore.setRoutes(parsedRoutes, 0);
      routeStore.setIsLoadingRoutes(false);

      // Sync active route coordinates to navigation store for map rendering
      if (parsedRoutes[0]) {
        useNavigationStore.getState().setRouteCoordinates(parsedRoutes[0].geometry);
      }

      return parsedRoutes;
    } catch (err: any) {
      console.error('Failed to fetch Mapbox directions:', err);
      routeStore.setRouteError(err.message || 'Error fetching directions');
      routeStore.setIsLoadingRoutes(false);
      return [];
    }
  },

  selectAlternativeRoute(index: number) {
    const routeStore = useRouteStore.getState();
    routeStore.selectRoute(index);
    const selected = routeStore.availableRoutes[index];
    if (selected) {
      useNavigationStore.getState().setRouteCoordinates(selected.geometry);
    }
  },
};

import { useRouteStore, type TravelMode, type RouteData, type RouteStep } from '../../stores/useRouteStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { getMapboxToken } from '../api/envConfig';


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
    mode: TravelMode = 'driving',
    originCoords?: [number, number]
  ): Promise<RouteData[]> {
    const navStore = useNavigationStore.getState();
    const locStore = useLocationStore.getState();
    const routeStore = useRouteStore.getState();

    // Priority: Explicit parameter > Navigation store custom source > Current GPS location
    let originLon: number | null = null;
    let originLat: number | null = null;

    if (originCoords && originCoords.length === 2 && !isNaN(originCoords[0]) && !isNaN(originCoords[1])) {
      originLon = originCoords[0];
      originLat = originCoords[1];
    } else if (navStore.source?.coordinates && navStore.source.coordinates.length === 2) {
      originLon = navStore.source.coordinates[0];
      originLat = navStore.source.coordinates[1];
    } else if (locStore.longitude !== null && locStore.latitude !== null) {
      originLon = locStore.longitude;
      originLat = locStore.latitude;
    }

    if (originLon === null || originLat === null) {
      console.warn('Cannot calculate route without origin coordinates (no source selected and GPS not acquired)');
      routeStore.setRouteError('Please select a starting point or enable GPS');
      routeStore.setIsLoadingRoutes(false);
      return [];
    }

    routeStore.setIsLoadingRoutes(true);
    routeStore.setRouteError(null);

    const modeConfig = TRAVEL_MODES.find((m) => m.id === mode) || TRAVEL_MODES[0];
    const profile = modeConfig.mapboxProfile;

    try {
      const token = getMapboxToken();
      const url = `https://api.mapbox.com/directions/v5/${profile}/${originLon},${originLat};${destinationCoords[0]},${destinationCoords[1]}?geometries=geojson&steps=true&alternatives=true&overview=full&access_token=${token}`;
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
          origin: [originLon, originLat],
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

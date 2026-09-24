/**
 * YatraSaarthi — Offline Navigation Controller
 *
 * Orchestrates offline saved-route navigation:
 * 1. Listens to connectivity changes (online/offline events)
 * 2. Consumes real GPS positions from useLocationStore
 * 3. Runs LocalRouteMatcher against saved route geometry
 * 4. Updates useOfflineNavigationStore with match results
 *
 * Does NOT fabricate any position, speed, or heading data.
 * Does NOT request online directions while offline.
 */

import { useLocationStore } from '../../stores/useLocationStore';
import { useOfflineNavigationStore } from '../../stores/useOfflineNavigationStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import {
  offlineRouteStorage,
  type OfflineRouteRecord,
  type OfflineRouteStep,
} from './offlineRouteStorage';
import { LocalRouteMatcher } from './localRouteMatcher';
import type { RouteData, RouteStep } from '../../stores/useRouteStore';

class OfflineNavigationController {
  private matcher: LocalRouteMatcher | null = null;
  private locationUnsubscribe: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private isInitialized = false;

  /**
   * Initialize connectivity listeners. Call once at app startup.
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    const store = useOfflineNavigationStore.getState();

    // Set initial connectivity
    store.setConnectivity(navigator.onLine ? 'ONLINE' : 'OFFLINE');

    // Listen for connectivity changes
    this.onlineHandler = () => {
      console.log('[OfflineNav] Network online detected');
      const offStore = useOfflineNavigationStore.getState();
      if (offStore.offlineNavMode === 'OFFLINE_SAVED_ROUTE') {
        offStore.setConnectivity('ONLINE');
        // Brief reconnecting state, then settle
        setTimeout(() => {
          const current = useOfflineNavigationStore.getState();
          if (current.offlineNavMode === 'RECONNECTING') {
            current.setOfflineNavMode('ONLINE_NAVIGATION');
          }
        }, 2000);
      } else {
        offStore.setConnectivity('ONLINE');
        if (offStore.offlineNavMode === 'OFFLINE_NO_SAVED_ROUTE') {
          offStore.setOfflineNavMode('ONLINE_NAVIGATION');
        }
      }
    };

    this.offlineHandler = () => {
      console.log('[OfflineNav] Network offline detected');
      const offStore = useOfflineNavigationStore.getState();
      offStore.setConnectivity('OFFLINE');
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  /**
   * Start offline navigation with a saved route.
   */
  startNavigation(route: OfflineRouteRecord): void {
    this.matcher = new LocalRouteMatcher(route);
    useOfflineNavigationStore.getState().startOfflineNavigation(route);

    // Subscribe to GPS location updates
    this.locationUnsubscribe = useLocationStore.subscribe((state) => {
      if (state.latitude != null && state.longitude != null) {
        this.onGPSUpdate(
          [state.longitude, state.latitude],
          state.accuracy,
          state.speed
        );
      }
    });

    console.log('[OfflineNav] Started offline navigation:', route.destination);
  }

  /**
   * Stop offline navigation.
   */
  stopNavigation(): void {
    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }
    this.matcher = null;
    useOfflineNavigationStore.getState().stopOfflineNavigation();
    console.log('[OfflineNav] Stopped offline navigation');
  }

  /**
   * Process a real GPS update through the route matcher.
   */
  private onGPSUpdate(
    position: [number, number],
    accuracy: number | null,
    speed: number | null
  ): void {
    if (!this.matcher) return;

    const offStore = useOfflineNavigationStore.getState();
    if (!offStore.isOfflineNavActive) return;

    const result = this.matcher.match(position, accuracy, speed);
    offStore.setRouteMatchResult(result);
  }

  /**
   * Convert a RouteData + metadata into an OfflineRouteRecord and save it.
   */
  async saveRouteForOffline(
    routeData: RouteData,
    originName: string,
    destinationName: string
  ): Promise<OfflineRouteRecord> {
    const vehicleType = useSettingsStore.getState().settings.vehicle_type;

    // Compute bounds from geometry
    let bounds: [[number, number], [number, number]] | null = null;
    if (routeData.geometry && routeData.geometry.length > 0) {
      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      for (const [lon, lat] of routeData.geometry) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
      bounds = [[minLon, minLat], [maxLon, maxLat]];
    }

    // Convert steps
    const offlineSteps: OfflineRouteStep[] = (routeData.steps || []).map((s: RouteStep, idx: number) => ({
      instruction: s.instruction || '',
      roadName: s.name || '',
      distance: s.distance_m || 0,
      duration: s.duration_s || 0,
      maneuver: s.type || 'continue',
      modifier: s.modifier,
      coordinates: routeData.geometry?.[
        Math.min(
          Math.floor((idx / Math.max(1, (routeData.steps?.length || 1))) * routeData.geometry.length),
          routeData.geometry.length - 1
        )
      ] || routeData.origin,
    }));

    const record: OfflineRouteRecord = {
      id: `offline-${routeData.id}-${Date.now()}`,
      origin: originName || 'Origin',
      destination: destinationName || 'Destination',
      originCoordinates: routeData.origin,
      destinationCoordinates: routeData.destination,
      routeGeometry: routeData.geometry,
      routeDistance: routeData.distance_meters,
      estimatedDuration: routeData.duration_seconds,
      steps: offlineSteps,
      routeBounds: bounds,
      vehicleType,
      savedAt: new Date().toISOString(),
      provider: 'mapbox',
      routeVersion: '1.0',
      summary: routeData.summary,
      travelMode: 'driving',
    };

    await offlineRouteStorage.saveRoute(record);
    console.log('[OfflineNav] Route saved for offline:', record.destination);
    return record;
  }

  /**
   * Cleanup on app unmount.
   */
  destroy(): void {
    this.stopNavigation();
    if (typeof window !== 'undefined') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }
    this.isInitialized = false;
  }
}

export const offlineNavigationController = new OfflineNavigationController();

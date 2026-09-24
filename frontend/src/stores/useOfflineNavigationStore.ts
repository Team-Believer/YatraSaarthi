/**
 * YatraSaarthi — Offline Navigation Store
 *
 * Manages connectivity state, offline saved-route navigation state,
 * and the active offline route match result.
 *
 * Navigation modes:
 *   ONLINE_NAVIGATION       — Normal server-connected navigation
 *   OFFLINE_SAVED_ROUTE     — Navigating a previously saved route with phone GPS only
 *   OFFLINE_NO_SAVED_ROUTE  — Offline but no saved route available
 *   RECONNECTING            — Transitioning from offline back to online
 */

import { create } from 'zustand';
import type { OfflineRouteRecord } from '../services/offline/offlineRouteStorage';
import type { RouteMatchResult, RouteDeviationStatus } from '../services/offline/localRouteMatcher';

export type ConnectivityState = 'ONLINE' | 'OFFLINE' | 'RECONNECTING';

export type OfflineNavigationMode =
  | 'ONLINE_NAVIGATION'
  | 'OFFLINE_SAVED_ROUTE'
  | 'OFFLINE_NO_SAVED_ROUTE'
  | 'RECONNECTING';

export interface OfflineNavigationState {
  // Connectivity
  connectivity: ConnectivityState;

  // Navigation mode
  offlineNavMode: OfflineNavigationMode;

  // Active offline route
  activeOfflineRoute: OfflineRouteRecord | null;

  // Current match result from LocalRouteMatcher
  routeMatchResult: RouteMatchResult | null;

  // Deviation status (convenience accessor)
  deviationStatus: RouteDeviationStatus;

  // Is offline navigation actively running?
  isOfflineNavActive: boolean;

  // Actions
  setConnectivity: (state: ConnectivityState) => void;
  setOfflineNavMode: (mode: OfflineNavigationMode) => void;
  setActiveOfflineRoute: (route: OfflineRouteRecord | null) => void;
  setRouteMatchResult: (result: RouteMatchResult | null) => void;
  startOfflineNavigation: (route: OfflineRouteRecord) => void;
  stopOfflineNavigation: () => void;
  resetOfflineNav: () => void;
}

export const useOfflineNavigationStore = create<OfflineNavigationState>((set) => ({
  connectivity: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE',
  offlineNavMode: 'ONLINE_NAVIGATION',
  activeOfflineRoute: null,
  routeMatchResult: null,
  deviationStatus: 'UNKNOWN',
  isOfflineNavActive: false,

  setConnectivity: (connectivity) =>
    set((state) => {
      if (connectivity === 'ONLINE' && state.offlineNavMode === 'OFFLINE_SAVED_ROUTE') {
        // Transition from offline to online
        return { connectivity, offlineNavMode: 'RECONNECTING' };
      }
      if (connectivity === 'OFFLINE' && state.offlineNavMode === 'ONLINE_NAVIGATION') {
        if (state.activeOfflineRoute) {
          return { connectivity, offlineNavMode: 'OFFLINE_SAVED_ROUTE' };
        }
        return { connectivity, offlineNavMode: 'OFFLINE_NO_SAVED_ROUTE' };
      }
      return { connectivity };
    }),

  setOfflineNavMode: (offlineNavMode) => set({ offlineNavMode }),

  setActiveOfflineRoute: (activeOfflineRoute) => set({ activeOfflineRoute }),

  setRouteMatchResult: (routeMatchResult) =>
    set({
      routeMatchResult,
      deviationStatus: routeMatchResult?.deviationStatus ?? 'UNKNOWN',
    }),

  startOfflineNavigation: (route) =>
    set({
      activeOfflineRoute: route,
      offlineNavMode: 'OFFLINE_SAVED_ROUTE',
      isOfflineNavActive: true,
      routeMatchResult: null,
      deviationStatus: 'UNKNOWN',
    }),

  stopOfflineNavigation: () =>
    set({
      isOfflineNavActive: false,
      routeMatchResult: null,
      deviationStatus: 'UNKNOWN',
      offlineNavMode: 'ONLINE_NAVIGATION',
    }),

  resetOfflineNav: () =>
    set({
      connectivity: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE',
      offlineNavMode: 'ONLINE_NAVIGATION',
      activeOfflineRoute: null,
      routeMatchResult: null,
      deviationStatus: 'UNKNOWN',
      isOfflineNavActive: false,
    }),
}));

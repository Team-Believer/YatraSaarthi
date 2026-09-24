/**
 * YatraSaarthi - Three-Dimensional System State Hook
 *
 * Explicitly separates:
 * 1. NETWORK STATE (Online vs Offline vs Backend Unavailable)
 * 2. GNSS STATE (Available vs Degraded vs Lost vs Recovering)
 * 3. NAVIGATION ENGINE STATE (GNSS-Aided vs Server DR vs Local Engine vs Unavailable)
 *
 * NEVER conflates "Network Offline" with "GNSS Lost".
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { onnxInferenceService } from '../services/offline/onnxInferenceService';
import { offlineSessionService } from '../services/offline/offlineSessionService';

import { getApiBaseUrl } from '../services/api/apiConfig';

export type NetworkState = 'ONLINE' | 'OFFLINE' | 'BACKEND_UNAVAILABLE';
export type GnssState = 'AVAILABLE' | 'DEGRADED' | 'LOST' | 'RECOVERING';
export type NavigationEngineState =
  | 'GNSS_AIDED'
  | 'DEAD_RECKONING_SERVER'
  | 'LOCAL_OFFLINE_ENGINE'
  | 'ENGINE_UNAVAILABLE';

export interface SystemStatusSnapshot {
  networkState: NetworkState;
  gnssState: GnssState;
  engineState: NavigationEngineState;
  isPwaInstalled: boolean;
  isServiceWorkerActive: boolean;
  lastOnlineAt: string | null;
  statusLabel: string;
  badgeTone: 'emerald' | 'amber' | 'rose' | 'slate';
}

export function useSystemState(): SystemStatusSnapshot {
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE'
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<string | null>(() =>
    typeof navigator !== 'undefined' && navigator.onLine ? new Date().toISOString() : null
  );

  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);

  // Read telemetry from Navigation store
  const navigationState = useNavigationStore((s) => s.state);
  const wsStatus = useNavigationStore((s) => s.websocketStatus);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);

  // Read raw GNSS accuracy from Location store
  const locationAccuracy = useLocationStore((s) => s.accuracy);

  // 1. Determine GNSS State independently
  const determineGnssState = useCallback((): GnssState => {
    // If backend reports outage or gnss is unavailable
    if (
      (navigationState && !navigationState.gnss_available) ||
      (navigationState && navigationState.gnss_outage_duration > 0)
    ) {
      return 'LOST';
    }

    if (locationAccuracy === null || locationAccuracy === undefined) {
      return 'DEGRADED';
    }

    if (locationAccuracy < 15) {
      return 'AVAILABLE';
    } else if (locationAccuracy < 35) {
      return 'DEGRADED';
    } else {
      return 'LOST';
    }
  }, [navigationState, locationAccuracy]);

  // 2. Determine Navigation Engine State independently
  const determineEngineState = useCallback((): NavigationEngineState => {
    const isLive = sessionStatus === 'LIVE' || offlineSessionService.isSessionActive();
    if (!isLive) {
      return 'ENGINE_UNAVAILABLE';
    }

    // If WebSocket is actively streaming to Python backend
    if (wsStatus === 'CONNECTED' && networkState === 'ONLINE') {
      if (
        (navigationState && !navigationState.gnss_available) ||
        (navigationState && navigationState.navigation_mode?.includes('DEAD_RECKONING'))
      ) {
        return 'DEAD_RECKONING_SERVER';
      }
      return 'GNSS_AIDED';
    }

    // If offline or disconnected from server, check if client ONNX models are ready
    if (onnxInferenceService.getStatus() === 'READY') {
      return 'LOCAL_OFFLINE_ENGINE';
    }

    // If offline but models not loaded or failed
    return 'ENGINE_UNAVAILABLE';
  }, [sessionStatus, wsStatus, networkState, navigationState]);

  // 3. Network listeners & periodic backend ping
  useEffect(() => {
    const handleOnline = () => {
      setNetworkState('ONLINE');
      setLastOnlineAt(new Date().toISOString());
      checkBackendReachability();
    };

    const handleOffline = () => {
      setNetworkState('OFFLINE');
    };

    const checkBackendReachability = async () => {
      if (!navigator.onLine) {
        setNetworkState('OFFLINE');
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const apiBase = getApiBaseUrl();
        const healthUrl = apiBase ? `${apiBase}/health` : '/health';
        const res = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (res && res.ok) {
          setNetworkState('ONLINE');
        } else {
          // Connected to WiFi/Cellular but local backend server is not running
          setNetworkState('BACKEND_UNAVAILABLE');
        }
      } catch {
        setNetworkState('BACKEND_UNAVAILABLE');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      checkBackendReachability();
    }

    // Check SW & Standalone Display
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setIsServiceWorkerActive(true);
    }
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPwaInstalled(!!isStandalone);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const gnssState = determineGnssState();
  const engineState = determineEngineState();

  // Unified visual badge tone and label
  let statusLabel = 'System Online';
  let badgeTone: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald';

  if (networkState === 'OFFLINE') {
    statusLabel = 'Offline Mode';
    badgeTone = 'slate';
  } else if (networkState === 'BACKEND_UNAVAILABLE') {
    statusLabel = 'Backend Offline';
    badgeTone = 'amber';
  } else if (gnssState === 'LOST') {
    statusLabel = 'GNSS Lost · DR Active';
    badgeTone = 'amber';
  }

  return {
    networkState,
    gnssState,
    engineState,
    isPwaInstalled,
    isServiceWorkerActive,
    lastOnlineAt,
    statusLabel,
    badgeTone,
  };
}

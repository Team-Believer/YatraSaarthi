import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, MonitorOff, WifiOff, MapPinOff } from 'lucide-react';
import { getMapboxToken } from '../../services/api/envConfig';
import { useOfflineNavigationStore } from '../../stores/useOfflineNavigationStore';
import { offlineMapService } from '../../services/offline/offlineMapService';

interface MapContainerProps {
  onMapLoaded?: (map: mapboxgl.Map) => void;
  children?: React.ReactNode;
  initialCenter?: [number, number];
  initialZoom?: number;
  initialPitch?: number;
  styleUrl?: string;
  className?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  onMapLoaded,
  children,
  initialCenter = [78.9629, 20.5937],
  initialZoom = 16,
  initialPitch = 45,
  styleUrl = 'mapbox://styles/mapbox/navigation-day-v1',
  className = 'w-full h-full',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [isOfflineMapActive, setIsOfflineMapActive] = useState(false);
  const [isOutsideOfflineBounds, setIsOutsideOfflineBounds] = useState(false);

  const isOfflineNavActive = useOfflineNavigationStore((s) => s.isOfflineNavActive);
  const activeOfflineRoute = useOfflineNavigationStore((s) => s.activeOfflineRoute);
  const connectivity = useOfflineNavigationStore((s) => s.connectivity);

  const token = getMapboxToken();

  // Load offline style when offline navigation starts or changes
  const applyOfflineStyleIfAvailable = useCallback(async (map: mapboxgl.Map, routeId: string) => {
    try {
      const offlineStyle = await offlineMapService.getOfflineStyleForRoute(routeId);
      if (offlineStyle) {
        console.log('[MapContainer] Applying offline Mapbox style for route:', routeId);
        map.setStyle(offlineStyle, { diff: false } as any);
        setIsOfflineMapActive(true);
        return true;
      }
    } catch (e) {
      console.warn('[MapContainer] Failed to apply offline style:', e);
    }
    return false;
  }, []);

  useEffect(() => {
    // 1. Check Mapbox token validity
    if (
      !token ||
      token.trim() === '' ||
      token.includes('your_mapbox_access_token') ||
      token.includes('your_mapbox_public_token_here')
    ) {
      setError('Mapbox Access Token is missing or placeholder. Set MAPBOX_TOKEN in frontend/.env.');
      return;
    }

    // 2. Check WebGL support
    if (!mapboxgl.supported()) {
      setWebGlSupported(false);
      return;
    }

    if (!containerRef.current || mapInstanceRef.current) return;

    mapboxgl.accessToken = token;

    let isSubscribed = true;

    const initMap = async () => {
      let initialStyle: any = styleUrl;

      // Check if starting directly in offline mode with a saved route
      if (activeOfflineRoute?.id) {
        const offlineStyle = await offlineMapService.getOfflineStyleForRoute(activeOfflineRoute.id);
        if (offlineStyle && isSubscribed) {
          initialStyle = offlineStyle;
          setIsOfflineMapActive(true);
        }
      }

      if (!containerRef.current || !isSubscribed) return;

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: initialStyle,
          center: initialCenter,
          zoom: initialZoom,
          pitch: initialPitch,
          attributionControl: false,
        });

        map.on('load', () => {
          if (!isSubscribed) return;
          setMapLoaded(true);
          if (onMapLoaded) {
            try {
              onMapLoaded(map);
            } catch (e) {
              console.warn('[MapContainer] onMapLoaded callback warning:', e);
            }
          }
        });

        map.on('error', (e) => {
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          if (isOffline) {
            console.warn('[MapContainer] Map tile warning while offline:', e.error?.message || e);
            // Allow map to remain loaded so overlays and route geometry render
            setMapLoaded(true);
          } else {
            console.warn('[MapContainer] Mapbox GL Warning/Error:', e.error?.message || e);
          }
        });

        // Monitor viewport position vs offline route bounds
        map.on('moveend', () => {
          if (!isSubscribed) return;
          const currentOffline = useOfflineNavigationStore.getState().isOfflineNavActive;
          const currentRoute = useOfflineNavigationStore.getState().activeOfflineRoute;
          if (currentOffline && currentRoute?.routeBounds) {
            const center = map.getCenter();
            const [[swLng, swLat], [neLng, neLat]] = currentRoute.routeBounds;
            const margin = 0.05; // margin before showing outside alert
            const isOutside =
              center.lng < swLng - margin ||
              center.lng > neLng + margin ||
              center.lat < swLat - margin ||
              center.lat > neLat + margin;
            setIsOutsideOfflineBounds(isOutside);
          } else {
            setIsOutsideOfflineBounds(false);
          }
        });

        mapInstanceRef.current = map;
      } catch (err: any) {
        console.error('[MapContainer] Map initialization error:', err);
        if (isSubscribed) {
          setError(err.message || 'Failed to initialize Mapbox instance.');
        }
      }
    };

    initMap();

    // ResizeObserver for handling layout/drawer changes smoothly
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (mapInstanceRef.current && mapInstanceRef.current.getCanvas()) {
          mapInstanceRef.current.resize();
        }
      } catch {}
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      isSubscribed = false;
      try {
        resizeObserver.disconnect();
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      } catch (e) {
        console.warn('[MapContainer] Map removal cleanup warning:', e);
      }
    };
  }, [token]);

  // React to offline navigation state changes (e.g. user starts offline route)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isOfflineNavActive && activeOfflineRoute?.id) {
      applyOfflineStyleIfAvailable(map, activeOfflineRoute.id);
    } else if (!isOfflineNavActive && connectivity === 'ONLINE' && isOfflineMapActive) {
      // Revert back to online style when returning to online navigation
      try {
        console.log('[MapContainer] Reverting to online style:', styleUrl);
        map.setStyle(styleUrl, { diff: false } as any);
        setIsOfflineMapActive(false);
      } catch (e) {
        console.warn('[MapContainer] Revert style warning:', e);
      }
    }
  }, [isOfflineNavActive, activeOfflineRoute, connectivity, isOfflineMapActive, styleUrl, applyOfflineStyleIfAvailable]);

  if (!webGlSupported) {
    return (
      <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center p-8 text-center select-none">
        <div className="space-y-3 max-w-sm">
          <MonitorOff className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-bold text-white text-base">WebGL Unsupported</h3>
          <p className="text-xs text-slate-400">
            Hardware accelerated map rendering is unavailable on this browser. Navigation remains available.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center p-8 text-center select-none">
        <div className="space-y-3 max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-bold text-white text-base">Mapbox Configuration Required</h3>
          <p className="text-xs text-slate-300 bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 font-mono leading-relaxed">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Offline Map Status Badge */}
      {isOfflineNavActive && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1 animate-in fade-in">
          {isOfflineMapActive ? (
            <div className="bg-[#083335]/90 backdrop-blur-md text-emerald-300 text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30 shadow-nav-floating">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Map Active</span>
            </div>
          ) : (
            <div className="bg-amber-900/90 backdrop-blur-md text-amber-200 text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-500/30 shadow-nav-floating">
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>Offline Route Navigation</span>
            </div>
          )}

          {isOutsideOfflineBounds && (
            <div className="bg-rose-900/90 backdrop-blur-md text-rose-100 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30 shadow-nav-floating">
              <MapPinOff className="w-3 h-3 text-rose-300" />
              <span>Outside downloaded map region</span>
            </div>
          )}
        </div>
      )}

      {mapLoaded && mapInstanceRef.current && (
        <MapContext.Provider value={mapInstanceRef.current}>
          {children}
        </MapContext.Provider>
      )}
    </div>
  );
};

// MapContext to pass map instance to children components
export const MapContext = React.createContext<mapboxgl.Map | null>(null);
export const useMap = () => React.useContext(MapContext);

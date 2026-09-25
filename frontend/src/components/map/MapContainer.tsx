import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, MonitorOff, WifiOff } from 'lucide-react';
import { getMapboxToken } from '../../services/api/envConfig';

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
  const [isOfflineStyleFallback, setIsOfflineStyleFallback] = useState(false);

  const token = getMapboxToken();

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

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: initialCenter,
        zoom: initialZoom,
        pitch: initialPitch,
        attributionControl: false,
      });

      map.on('load', () => {
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
        // If style fails to load while offline, prevent fatal crash and show offline indicator
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOffline) {
          console.warn('[MapContainer] Map tile request while offline:', e.error?.message || e);
          setIsOfflineStyleFallback(true);
          // Set map as loaded so child overlays/markers can still render
          setMapLoaded(true);
          if (onMapLoaded) {
            try {
              onMapLoaded(map);
            } catch {}
          }
        } else {
          console.warn('[MapContainer] Mapbox GL Warning/Error:', e.error?.message || e);
        }
      });

      mapInstanceRef.current = map;

      // ResizeObserver for handling layout/drawer changes smoothly
      const resizeObserver = new ResizeObserver(() => {
        try {
          if (mapInstanceRef.current && mapInstanceRef.current.getCanvas()) {
            mapInstanceRef.current.resize();
          }
        } catch {}
      });
      resizeObserver.observe(containerRef.current);

      return () => {
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
    } catch (err: any) {
      console.error('[MapContainer] Map initialization error:', err);
      setError(err.message || 'Failed to initialize Mapbox instance.');
    }
  }, [token]);

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
      {isOfflineStyleFallback && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-900/80 backdrop-blur-md text-amber-100 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-500/30">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline map — Saved route navigation active</span>
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

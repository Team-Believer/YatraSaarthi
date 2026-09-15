import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, MonitorOff } from 'lucide-react';

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
  initialCenter = [72.5714, 23.0225], // Fallback center only
  initialZoom = 15,
  initialPitch = 45,
  styleUrl = 'mapbox://styles/mapbox/streets-v12',
  className = 'w-full h-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    // 1. Check Mapbox token validity
    if (!token || token.trim() === '' || token.includes('your_mapbox_access_token')) {
      setError('Mapbox Access Token is missing. Set VITE_MAPBOX_TOKEN in frontend/.env.');
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

      // Add navigation controls (zoom, pitch, compass)
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('load', () => {
        setMapLoaded(true);
        if (onMapLoaded) onMapLoaded(map);
      });

      map.on('error', (e) => {
        console.warn('Mapbox GL Warning/Error:', e.error?.message || e);
      });

      mapInstanceRef.current = map;

      // 3. ResizeObserver for handling layout/sidebar changes
      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Mapbox instance.');
    }
  }, [token, styleUrl]);

  if (!webGlSupported) {
    return (
      <div className="w-full h-full bg-brand-50 border border-brand-100 rounded-3xl flex items-center justify-center p-8 text-center">
        <div className="space-y-3 max-w-sm">
          <MonitorOff className="w-12 h-12 text-status-warning mx-auto" />
          <h3 className="font-bold text-brand-navy">WebGL Unsupported</h3>
          <p className="text-xs text-gray-500">Map rendering is unavailable on this device/browser.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-brand-50 border border-brand-100 rounded-3xl flex items-center justify-center p-8 text-center">
        <div className="space-y-3 max-w-md">
          <AlertCircle className="w-10 h-10 text-status-danger mx-auto" />
          <h3 className="font-bold text-brand-navy">Mapbox Configuration Required</h3>
          <p className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
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

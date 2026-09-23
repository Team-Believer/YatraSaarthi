import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation } from 'lucide-react';
import type { TrajectoryPoint } from '../../services/api/historyService';

interface TripRouteMapProps {
  points?: TrajectoryPoint[];
  startLat?: number | null;
  startLon?: number | null;
  endLat?: number | null;
  endLon?: number | null;
  className?: string;
}

export const TripRouteMap: React.FC<TripRouteMapProps> = ({
  points = [],
  startLat,
  startLon,
  endLat,
  endLon,
  className = 'w-full h-64 sm:h-72',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  // Extract valid [lng, lat] coordinate pairs
  const coordinates: [number, number][] = React.useMemo(() => {
    const coords: [number, number][] = [];

    if (points && points.length > 0) {
      for (const p of points) {
        if (
          typeof p.latitude === 'number' &&
          typeof p.longitude === 'number' &&
          !isNaN(p.latitude) &&
          !isNaN(p.longitude) &&
          Math.abs(p.latitude) <= 90 &&
          Math.abs(p.longitude) <= 180
        ) {
          coords.push([p.longitude, p.latitude]);
        }
      }
    }

    // Fallback to start/end points if points array has < 2 valid coordinates but start & end exist
    if (
      coords.length < 2 &&
      startLat !== null &&
      startLat !== undefined &&
      startLon !== null &&
      startLon !== undefined &&
      endLat !== null &&
      endLat !== undefined &&
      endLon !== null &&
      endLon !== undefined
    ) {
      coords.push([startLon, startLat]);
      coords.push([endLon, endLat]);
    }

    return coords;
  }, [points, startLat, startLon, endLat, endLon]);

  const hasValidRoute = coordinates.length >= 2;

  useEffect(() => {
    if (!hasValidRoute || !containerRef.current || !token) return;

    mapboxgl.accessToken = token;

    const initialCenter = coordinates[0] || [78.9629, 20.5937];

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/navigation-day-v1',
        center: initialCenter,
        zoom: 13,
        interactive: true,
        attributionControl: false,
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;

      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (startMarkerRef.current) startMarkerRef.current.remove();
        if (endMarkerRef.current) endMarkerRef.current.remove();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        setMapLoaded(false);
      };
    } catch (err) {
      console.warn('Mapbox initialization error on TripRouteMap:', err);
    }
  }, [hasValidRoute, token]);

  // Update Route Polyline & Markers whenever coordinates or mapLoaded changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !hasValidRoute || coordinates.length < 2) return;

    const sourceId = 'trip-route-source';
    const casingLayerId = 'trip-route-casing';
    const lineLayerId = 'trip-route-line';

    const geojson: any = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };

    const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      // Casing
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0f172a',
          'line-width': 8,
          'line-opacity': 0.25,
        },
      });

      // Active Route Polyline
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2563eb',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });
    }

    // Start marker
    const startCoord = coordinates[0];
    if (startCoord) {
      if (!startMarkerRef.current) {
        const startEl = document.createElement('div');
        startEl.className = 'w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold select-none';
        startEl.innerText = 'A';
        startMarkerRef.current = new mapboxgl.Marker({ element: startEl, anchor: 'center' })
          .setLngLat(startCoord)
          .addTo(map);
      } else {
        startMarkerRef.current.setLngLat(startCoord);
      }
    }

    // Destination marker
    const endCoord = coordinates[coordinates.length - 1];
    if (endCoord) {
      if (!endMarkerRef.current) {
        const endEl = document.createElement('div');
        endEl.className = 'w-6 h-6 rounded-full bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold select-none';
        endEl.innerText = 'B';
        endMarkerRef.current = new mapboxgl.Marker({ element: endEl, anchor: 'center' })
          .setLngLat(endCoord)
          .addTo(map);
      } else {
        endMarkerRef.current.setLngLat(endCoord);
      }
    }

    // Fit bounds to trajectory
    try {
      const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
      for (const coord of coordinates) {
        bounds.extend(coord);
      }
      map.fitBounds(bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 15,
        duration: 800,
      });
    } catch (e) {
      console.warn('Could not fit bounds on trip route map:', e);
    }
  }, [mapLoaded, coordinates, hasValidRoute]);

  if (!hasValidRoute) {
    return (
      <div className={`bg-canvas-soft border border-border-clean rounded-2xl flex flex-col items-center justify-center p-8 text-center select-none ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-white border border-border-clean flex items-center justify-center text-ink-mute mb-2 shadow-2xs">
          <Navigation className="w-5 h-5 text-ink-mute" />
        </div>
        <p className="text-xs font-medium text-ink">Route map unavailable for this trip.</p>
        <p className="text-[11px] text-ink-body mt-0.5 max-w-xs">
          Trajectory coordinates were not recorded for this navigation session.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border-clean bg-slate-100 shadow-2xs ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {/* Route Badge in Top Corner */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-border-clean shadow-2xs text-[11px] font-medium text-ink flex items-center gap-1.5 pointer-events-none select-none">
        <MapPin className="w-3.5 h-3.5 text-blue-600" />
        <span>Recorded Route</span>
      </div>
    </div>
  );
};

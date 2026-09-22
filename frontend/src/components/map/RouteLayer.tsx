import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapContainer';

interface RouteLayerProps {
  geometry?: [number, number][]; // [[lon, lat], ...]
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ geometry = [] }) => {
  const map = useMap();
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const sourceId = 'source-active-route';
    const casingLayerId = 'layer-route-casing';
    const lineLayerId = 'layer-route-line';

    if (geometry.length < 2) {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    const geojson: any = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: geometry,
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

      // 1. Casing Layer for high contrast against diverse map styles
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0369a1',
          'line-width': 9,
          'line-opacity': 0.6,
        },
      });

      // 2. Primary Route Centerline
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 5,
        },
      });
    }

    // Add / Update Destination Waypoint Pin
    const destCoords = geometry[geometry.length - 1];
    if (destCoords) {
      if (!destMarkerRef.current) {
        const destEl = document.createElement('div');
        destEl.className = 'w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-nav-floating flex items-center justify-center text-white';
        destEl.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `;
        destMarkerRef.current = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
          .setLngLat(destCoords)
          .addTo(map);
      } else {
        destMarkerRef.current.setLngLat(destCoords);
      }
    }

    return () => {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    };
  }, [map, geometry]);

  return null;
};

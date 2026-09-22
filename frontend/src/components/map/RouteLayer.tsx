import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapContainer';

interface RouteLayerProps {
  geometry?: [number, number][]; // [[lon, lat], ...]
  destinationName?: string;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ geometry = [], destinationName }) => {
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

      // 1. Restrained Neutral Casing Layer for high contrast on all map styles
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
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            12, 7,
            15, 10,
            18, 14,
          ],
          'line-opacity': 0.35,
        },
      });

      // 2. Primary Route Centerline with zoom-responsive width
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
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 2.5,
            12, 4.5,
            15, 6.5,
            18, 9.5,
          ],
          'line-opacity': 0.95,
        },
      });
    }

    // Add / Update Destination Waypoint Pin
    const destCoords = geometry[geometry.length - 1];
    if (destCoords) {
      if (!destMarkerRef.current) {
        const destContainer = document.createElement('div');
        destContainer.className = 'flex flex-col items-center select-none pointer-events-none';

        // Clean Pin Badge
        const pinBadge = document.createElement('div');
        pinBadge.className = 'w-7 h-7 rounded-full bg-black border-2 border-white shadow-nav-floating flex items-center justify-center text-white';
        pinBadge.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `;
        destContainer.appendChild(pinBadge);

        // Optional Destination Label Badge
        if (destinationName) {
          const labelEl = document.createElement('div');
          labelEl.className = 'px-2.5 py-0.5 mt-1 bg-white border border-border-clean shadow-nav-floating rounded-full text-[10px] font-semibold text-ink whitespace-nowrap max-w-[140px] truncate';
          labelEl.innerText = destinationName;
          destContainer.appendChild(labelEl);
        }

        destMarkerRef.current = new mapboxgl.Marker({ element: destContainer, anchor: 'center' })
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
  }, [map, geometry, destinationName]);

  return null;
};


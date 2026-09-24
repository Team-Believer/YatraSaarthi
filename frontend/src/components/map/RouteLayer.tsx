import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapContainer';
import { useRouteStore } from '../../stores/useRouteStore';

interface RouteLayerProps {
  geometry?: [number, number][]; // [[lon, lat], ...]
  sourceName?: string;
  destinationName?: string;
  showAlternatives?: boolean;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({
  geometry = [],
  sourceName,
  destinationName,
  showAlternatives = true,
}) => {
  const map = useMap();
  const sourceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const availableRoutes = useRouteStore((s) => s.availableRoutes);
  const selectedRouteIndex = useRouteStore((s) => s.selectedRouteIndex);

  // 1. Render Alternative Routes (muted gray lines)
  useEffect(() => {
    if (!map) return;

    const altSourcePrefix = 'source-alt-route-';
    const altLayerPrefix = 'layer-alt-route-';

    // Filter out the selected route so only actual alternatives are rendered under the active route
    const altRoutes = showAlternatives
      ? availableRoutes.filter((_, idx) => idx !== selectedRouteIndex && _.geometry.length >= 2)
      : [];

    // Clean up previous alt layers/sources
    for (let i = 0; i < 5; i++) {
      const lid = `${altLayerPrefix}${i}`;
      const sid = `${altSourcePrefix}${i}`;
      if (map.getLayer(lid)) map.removeLayer(lid);
      if (map.getSource(sid)) map.removeSource(sid);
    }

    altRoutes.forEach((route, idx) => {
      const sourceId = `${altSourcePrefix}${idx}`;
      const layerId = `${altLayerPrefix}${idx}`;

      const geojson: any = {
        type: 'Feature',
        properties: { id: route.id, index: idx },
        geometry: {
          type: 'LineString',
          coordinates: route.geometry,
        },
      };

      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#94a3b8',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 2,
            12, 3.5,
            15, 5,
            18, 7,
          ],
          'line-opacity': 0.5,
        },
      });
    });

    return () => {
      for (let i = 0; i < 5; i++) {
        const lid = `${altLayerPrefix}${i}`;
        const sid = `${altSourcePrefix}${i}`;
        if (map.getLayer(lid)) map.removeLayer(lid);
        if (map.getSource(sid)) map.removeSource(sid);
      }
    };
  }, [map, availableRoutes, selectedRouteIndex, showAlternatives]);

  // 2. Render Active Primary Route & Waypoint Markers (Source & Destination)
  useEffect(() => {
    if (!map) return;

    const sourceId = 'source-active-route';
    const casingLayerId = 'layer-route-casing';
    const lineLayerId = 'layer-route-line';

    if (geometry.length < 2) {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (sourceMarkerRef.current) {
        sourceMarkerRef.current.remove();
        sourceMarkerRef.current = null;
      }
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

      // Restrained Neutral Casing Layer
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#031718',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4.5,
            12, 7.5,
            15, 10.5,
            18, 14.5,
          ],
          'line-opacity': 0.25,
        },
      });

      // Primary Route Centerline with YatraSaarthi Evergreen
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#083335',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 3,
            12, 5,
            15, 7,
            18, 10,
          ],
          'line-opacity': 1.0,
        },
      });
    }

    // Add / Update Source Waypoint Pin (Start)
    const startCoords = geometry[0];
    if (startCoords) {
      if (!sourceMarkerRef.current) {
        const startContainer = document.createElement('div');
        startContainer.className = 'flex flex-col items-center select-none pointer-events-none';

        const pinBadge = document.createElement('div');
        pinBadge.className = 'w-6.5 h-6.5 rounded-full bg-emerald-600 border-2 border-white shadow-nav-floating flex items-center justify-center text-white';
        pinBadge.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <circle cx="12" cy="12" r="8"/>
          </svg>
        `;
        startContainer.appendChild(pinBadge);

        if (sourceName) {
          const labelEl = document.createElement('div');
          labelEl.className = 'px-2 py-0.5 mt-1 bg-white border border-border-clean shadow-nav-floating rounded-full text-[10px] font-semibold text-emerald-800 whitespace-nowrap max-w-[130px] truncate';
          labelEl.innerText = sourceName;
          startContainer.appendChild(labelEl);
        }

        sourceMarkerRef.current = new mapboxgl.Marker({ element: startContainer, anchor: 'center' })
          .setLngLat(startCoords)
          .addTo(map);
      } else {
        sourceMarkerRef.current.setLngLat(startCoords);
      }
    }

    // Add / Update Destination Waypoint Pin
    const destCoords = geometry[geometry.length - 1];
    if (destCoords) {
      if (!destMarkerRef.current) {
        const destContainer = document.createElement('div');
        destContainer.className = 'flex flex-col items-center select-none pointer-events-none';

        // Clean Pin Badge
        const pinBadge = document.createElement('div');
        pinBadge.className = 'w-7 h-7 rounded-full bg-[#083335] border-2 border-white shadow-nav-floating flex items-center justify-center text-white';
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
      if (sourceMarkerRef.current) {
        sourceMarkerRef.current.remove();
        sourceMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    };
  }, [map, geometry, sourceName, destinationName]);

  return null;
};



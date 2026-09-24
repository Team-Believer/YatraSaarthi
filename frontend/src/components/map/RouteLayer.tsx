import React, { useEffect, useRef, useCallback } from 'react';
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

  const activeGeometry = geometry && geometry.length >= 2 ? geometry : null;

  // Synchronize and render all route lines (primary and alternatives) on map
  const syncLayers = useCallback(() => {
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once('style.load', syncLayers);
      return;
    }

    const altSourcePrefix = 'source-alt-route-';
    const altLayerPrefix = 'layer-alt-route-';
    const primarySourceId = 'source-active-route';
    const primaryCasingId = 'layer-route-casing';
    const primaryLineId = 'layer-route-line';

    // 1. RENDER ALTERNATIVE ROUTES (Muted neutral lines)
    const altRoutes = showAlternatives
      ? availableRoutes.filter((_, idx) => idx !== selectedRouteIndex && _.geometry && _.geometry.length >= 2)
      : [];

    // Remove obsolete alt layers/sources
    for (let i = 0; i < 5; i++) {
      const lid = `${altLayerPrefix}${i}`;
      const sid = `${altSourcePrefix}${i}`;
      if (i >= altRoutes.length) {
        if (map.getLayer(lid)) map.removeLayer(lid);
        if (map.getSource(sid)) map.removeSource(sid);
      }
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

      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geojson);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });
      }

      if (!map.getLayer(layerId)) {
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
              6, 3,
              10, 4.5,
              14, 6,
              18, 8,
            ],
            'line-opacity': 0.65,
          },
        });
      }
    });

    // 2. RENDER PRIMARY ACTIVE ROUTE (YatraSaarthi Evergreen with high-contrast casing)
    if (!activeGeometry || activeGeometry.length < 2) {
      if (map.getLayer(primaryLineId)) map.removeLayer(primaryLineId);
      if (map.getLayer(primaryCasingId)) map.removeLayer(primaryCasingId);
      if (map.getSource(primarySourceId)) map.removeSource(primarySourceId);
      return;
    }

    const primaryGeojson: any = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: activeGeometry,
      },
    };

    const existingPrimarySource = map.getSource(primarySourceId) as mapboxgl.GeoJSONSource;
    if (existingPrimarySource) {
      existingPrimarySource.setData(primaryGeojson);
    } else {
      map.addSource(primarySourceId, {
        type: 'geojson',
        data: primaryGeojson,
      });
    }

    // Outer casing layer for contrast
    if (!map.getLayer(primaryCasingId)) {
      map.addLayer({
        id: primaryCasingId,
        type: 'line',
        source: primarySourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 5,
            10, 8,
            14, 11,
            18, 15,
          ],
          'line-opacity': 0.9,
        },
      });
    }

    // Inner dominant Evergreen centerline
    if (!map.getLayer(primaryLineId)) {
      map.addLayer({
        id: primaryLineId,
        type: 'line',
        source: primarySourceId,
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
            6, 3.5,
            10, 5.5,
            14, 7.5,
            18, 11,
          ],
          'line-opacity': 1.0,
        },
      });
    }
  }, [map, availableRoutes, selectedRouteIndex, showAlternatives, activeGeometry]);

  // Main synchronization effect
  useEffect(() => {
    if (!map) return;

    syncLayers();

    const handleStyleLoad = () => {
      syncLayers();
    };

    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map, syncLayers]);

  // 3. WAYPOINT MARKERS (Start & Destination)
  useEffect(() => {
    if (!map) return;

    if (!activeGeometry || activeGeometry.length < 2) {
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

    // Origin Start Waypoint
    const startCoords = activeGeometry[0];
    if (startCoords) {
      if (!sourceMarkerRef.current) {
        const startContainer = document.createElement('div');
        startContainer.className = 'flex flex-col items-center select-none pointer-events-none';

        const pinBadge = document.createElement('div');
        pinBadge.className = 'w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-nav-floating flex items-center justify-center text-white';
        pinBadge.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
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

    // Destination Waypoint
    const destCoords = activeGeometry[activeGeometry.length - 1];
    if (destCoords) {
      if (!destMarkerRef.current) {
        const destContainer = document.createElement('div');
        destContainer.className = 'flex flex-col items-center select-none pointer-events-none';

        const pinBadge = document.createElement('div');
        pinBadge.className = 'w-7 h-7 rounded-full bg-[#083335] border-2 border-white shadow-nav-floating flex items-center justify-center text-white';
        pinBadge.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `;
        destContainer.appendChild(pinBadge);

        if (destinationName) {
          const labelEl = document.createElement('div');
          labelEl.className = 'px-2.5 py-0.5 mt-1 bg-white border border-border-clean shadow-nav-floating rounded-full text-[10px] font-semibold text-[#083335] whitespace-nowrap max-w-[140px] truncate';
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
      if (sourceMarkerRef.current) {
        sourceMarkerRef.current.remove();
        sourceMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    };
  }, [map, activeGeometry, sourceName, destinationName]);

  return null;
};



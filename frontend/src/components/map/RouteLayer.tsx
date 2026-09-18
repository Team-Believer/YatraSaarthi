import React, { useEffect } from 'react';
import { useMap } from './MapContainer';

interface RouteLayerProps {
  geometry?: [number, number][]; // [[lon, lat], ...]
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ geometry = [] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const sourceId = 'source-active-route';
    const casingLayerId = 'layer-route-casing';
    const lineLayerId = 'layer-route-line';

    if (geometry.length < 2) {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
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

      // Casing layer for visual depth
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0369a1',
          'line-width': 8,
          'line-opacity': 0.4,
        },
      });

      // Inner primary route line
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 5,
        },
      });
    }

    // Cleanup function on unmount
    return () => {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, geometry]);

  return null;
};

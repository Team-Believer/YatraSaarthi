import React, { useEffect } from 'react';
import { useMap } from './MapContainer';

interface TrajectoryLayerProps {
  gnssTrack?: [number, number][];
  drTrack?: [number, number][];
  fusedTrack?: [number, number][];
}

export const TrajectoryLayer: React.FC<TrajectoryLayerProps> = ({
  gnssTrack = [],
  drTrack = [],
  fusedTrack = [],
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Helper to add or update line layer
    const updateLineSource = (id: string, coords: [number, number][], color: string, dash?: number[]) => {
      const sourceId = `source-${id}`;
      const layerId = `layer-${id}`;

      if (coords.length < 2) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        return;
      }

      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
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

        const layerPaint: mapboxgl.LinePaint = {
          'line-color': color,
          'line-width': 4,
          'line-opacity': 0.8,
        };

        if (dash) {
          layerPaint['line-dasharray'] = dash;
        }

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: layerPaint,
        });
      }
    };

    updateLineSource('gnss-raw', gnssTrack, '#10b981', [2, 2]); // Emerald dashed for raw GNSS
    updateLineSource('dr-track', drTrack, '#f59e0b', [2, 1]);    // Amber dashed for DR track
    updateLineSource('fused-track', fusedTrack, '#0284c7');      // Brand Blue for fused track

  }, [map, gnssTrack, drTrack, fusedTrack]);

  return null;
};

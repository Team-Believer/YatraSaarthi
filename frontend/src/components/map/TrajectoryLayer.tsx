import React, { useEffect } from 'react';
import type { GeoJSONSource, LinePaint } from 'mapbox-gl';
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

    // Helper to add or update line layer incrementally
    const updateLineSource = (
      id: string,
      coords: [number, number][],
      color: string,
      width: number = 4,
      dash?: number[]
    ) => {
      const sourceId = `source-track-${id}`;
      const layerId = `layer-track-${id}`;

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

      const existingSource = map.getSource(sourceId) as GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geojson);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        const layerPaint: LinePaint = {
          'line-color': color,
          'line-width': width,
          'line-opacity': 0.75,
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

    // Raw GNSS Track (Emerald dashed)
    updateLineSource('gnss-raw', gnssTrack, '#10b981', 3, [2, 2]);
    // Dead Reckoning Inertial Track (Amber dashed)
    updateLineSource('dr-track', drTrack, '#f59e0b', 3.5, [2, 1]);
    // InEKF Fused Navigation Trail (Deep Sky/Cobalt)
    updateLineSource('fused-track', fusedTrack, '#0284c7', 4);

    return () => {
      ['gnss-raw', 'dr-track', 'fused-track'].forEach((id) => {
        const layerId = `layer-track-${id}`;
        const sourceId = `source-track-${id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      });
    };
  }, [map, gnssTrack, drTrack, fusedTrack]);

  return null;
};

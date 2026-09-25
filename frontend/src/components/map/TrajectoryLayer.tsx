import React, { useEffect } from 'react';
import type { GeoJSONSource, LinePaint } from 'mapbox-gl';
import { useMap } from './MapContainer';

interface TrajectoryLayerProps {
  gnssTrack?: [number, number][];
  drTrack?: [number, number][];
  fusedTrack?: [number, number][];
}

function safeRemoveLayer(map: any, layerId: string) {
  try {
    if (map && map.getStyle() && map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  } catch {}
}

function safeRemoveSource(map: any, sourceId: string) {
  try {
    if (map && map.getStyle() && map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  } catch {}
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
      width: number = 3,
      opacity: number = 0.55,
      dash?: number[]
    ) => {
      const sourceId = `source-track-${id}`;
      const layerId = `layer-track-${id}`;

      try {
        if (coords.length < 2) {
          safeRemoveLayer(map, layerId);
          safeRemoveSource(map, sourceId);
          return;
        }

        if (!map.getStyle()) return;

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
            'line-opacity': opacity,
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
      } catch (err) {
        console.warn(`[TrajectoryLayer] updateLineSource warning (${id}):`, err);
      }
    };

    // Raw GNSS Track (Tertiary: Subtle emerald dashed)
    updateLineSource('gnss-raw', gnssTrack, '#10b981', 2, 0.45, [2, 2]);
    // Dead Reckoning Inertial Track (Secondary: Amber dashed)
    updateLineSource('dr-track', drTrack, '#f59e0b', 2.5, 0.5, [2, 1.5]);
    // InEKF Fused Navigation Trail (Secondary: Soft cobalt trail)
    updateLineSource('fused-track', fusedTrack, '#3b82f6', 3, 0.6);

    return () => {
      ['gnss-raw', 'dr-track', 'fused-track'].forEach((id) => {
        safeRemoveLayer(map, `layer-track-${id}`);
        safeRemoveSource(map, `source-track-${id}`);
      });
    };
  }, [map, gnssTrack, drTrack, fusedTrack]);

  return null;
};

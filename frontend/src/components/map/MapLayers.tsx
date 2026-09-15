import React from 'react';
import { RouteLayer } from './RouteLayer';
import { TrajectoryLayer } from './TrajectoryLayer';

interface MapLayersProps {
  routeGeometry?: [number, number][];
  gnssTrack?: [number, number][];
  drTrack?: [number, number][];
  fusedTrack?: [number, number][];
}

export const MapLayers: React.FC<MapLayersProps> = ({
  routeGeometry,
  gnssTrack,
  drTrack,
  fusedTrack,
}) => {
  return (
    <>
      <RouteLayer geometry={routeGeometry} />
      <TrajectoryLayer gnssTrack={gnssTrack} drTrack={drTrack} fusedTrack={fusedTrack} />
    </>
  );
};

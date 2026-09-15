import React, { useEffect } from 'react';
import { useMap } from './MapContainer';

interface MapControllerProps {
  latitude: number;
  longitude: number;
  heading?: number;
  followVehicle?: boolean;
}

export const MapController: React.FC<MapControllerProps> = ({
  latitude,
  longitude,
  heading = 0,
  followVehicle = true,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || latitude === 0 || longitude === 0 || !followVehicle) return;

    map.easeTo({
      center: [longitude, latitude],
      bearing: heading,
      duration: 800,
    });
  }, [map, latitude, longitude, heading, followVehicle]);

  return null;
};

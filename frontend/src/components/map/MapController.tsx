import React, { useEffect, useRef } from 'react';
import { useMap } from './MapContainer';

export type MapOrientationMode = 'HEADING_UP' | 'NORTH_UP';

interface MapControllerProps {
  latitude: number | null;
  longitude: number | null;
  heading?: number;
  followVehicle?: boolean;
  orientationMode?: MapOrientationMode;
  is3D?: boolean;
  onManualInteraction?: () => void;
}

export const MapController: React.FC<MapControllerProps> = ({
  latitude,
  longitude,
  heading = 0,
  followVehicle = true,
  orientationMode = 'HEADING_UP',
  is3D = true,
  onManualInteraction,
}) => {
  const map = useMap();
  const isProgrammaticMove = useRef(false);
  const lastUpdateRef = useRef<number>(0);

  // Listen to manual map user interactions (drag, wheel, touch, pitch, rotate)
  useEffect(() => {
    if (!map) return;

    const handleUserInteraction = () => {
      if (!isProgrammaticMove.current) {
        if (onManualInteraction) {
          onManualInteraction();
        }
      }
    };

    map.on('dragstart', handleUserInteraction);
    map.on('wheel', handleUserInteraction);
    map.on('touchstart', handleUserInteraction);
    map.on('rotatestart', handleUserInteraction);
    map.on('pitchstart', handleUserInteraction);

    return () => {
      map.off('dragstart', handleUserInteraction);
      map.off('wheel', handleUserInteraction);
      map.off('touchstart', handleUserInteraction);
      map.off('rotatestart', handleUserInteraction);
      map.off('pitchstart', handleUserInteraction);
    };
  }, [map, onManualInteraction]);

  // Handle camera position & heading updates
  useEffect(() => {
    if (!map || latitude === null || longitude === null || latitude === 0 || longitude === 0) {
      return;
    }

    if (!followVehicle) return;

    // Throttle camera ease updates to max 20Hz (50ms) to ensure 60fps smoothness without overloading WebGL render loop
    const now = Date.now();
    if (now - lastUpdateRef.current < 50) return;
    lastUpdateRef.current = now;

    isProgrammaticMove.current = true;

    const targetBearing = orientationMode === 'HEADING_UP' ? heading : 0;
    const targetPitch = is3D ? 52 : 0;

    // In 3D follow mode, offset camera slightly so vehicle is positioned in lower-center, giving greater visibility of the road ahead
    map.easeTo({
      center: [longitude, latitude],
      bearing: targetBearing,
      pitch: targetPitch,
      zoom: 16.5,
      offset: is3D ? [0, 70] : [0, 0],
      duration: 600,
      easing: (t) => t * (2 - t), // Smooth quad out
    });

    // Reset programmatic flag after ease completes
    const timer = setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 650);

    return () => clearTimeout(timer);
  }, [map, latitude, longitude, heading, followVehicle, orientationMode, is3D]);

  return null;
};


import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapContainer';

interface VehicleMarkerProps {
  latitude: number | null;
  longitude: number | null;
  heading?: number;
  mode?: string;
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  latitude,
  longitude,
  heading = 0,
  mode = 'GNSS_AIDED',
}) => {
  const map = useMap();
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chevronRef = useRef<HTMLDivElement | null>(null);
  const prevHeadingRef = useRef<number>(heading);

  useEffect(() => {
    if (!map || latitude === null || longitude === null || latitude === 0 || longitude === 0) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const modeUpper = (mode || '').toUpperCase();
    const isRecovering = modeUpper.includes('REACQUISITION') || modeUpper.includes('RECOVERY');
    const isDr =
      !isRecovering &&
      (modeUpper.includes('DEAD_RECKONING') ||
        modeUpper.includes('LOST') ||
        modeUpper.includes('INEKF') ||
        modeUpper.includes('INERTIAL'));

    const getDiscClass = () => {
      if (isRecovering) {
        return 'w-11 h-11 rounded-full bg-gradient-to-tr from-sky-600 via-cyan-500 to-sky-400 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10 transition-colors duration-300';
      }
      if (isDr) {
        return 'w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10 transition-colors duration-300';
      }
      return 'w-11 h-11 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10 transition-colors duration-300';
    };

    const getRingClass = () => {
      if (isRecovering) {
        return 'absolute inset-1.5 rounded-full bg-sky-500/25 border border-sky-400/50 animate-pulse transition-all duration-300';
      }
      if (isDr) {
        return 'absolute inset-2 rounded-full bg-amber-500/20 border border-amber-400/40 animate-dr-pulse transition-all duration-300';
      }
      return 'absolute inset-2 rounded-full bg-sky-500/20 border border-sky-400/40 animate-gnss-pulse transition-all duration-300';
    };

    if (!markerRef.current) {
      // Create main marker container
      const container = document.createElement('div');
      container.className = 'relative flex items-center justify-center pointer-events-none select-none';
      container.style.width = '64px';
      container.style.height = '64px';

      // 1. Soft Position Accuracy Footprint Disc
      const accuracyRing = document.createElement('div');
      accuracyRing.className = getRingClass();
      container.appendChild(accuracyRing);

      // 2. Core Navigation Marker Disc
      const pinDisc = document.createElement('div');
      pinDisc.className = getDiscClass();

      // 3. Forward-Pointing Navigation Chevron
      const chevron = document.createElement('div');
      chevron.className = 'transform transition-transform duration-200 ease-out flex items-center justify-center';
      chevron.style.transformOrigin = 'center center';
      chevron.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="drop-shadow-xs">
          <path d="M12 2L4.5 19.5L6.2 20.8L12 17.5L17.8 20.8L19.5 19.5L12 2Z"/>
        </svg>
      `;
      pinDisc.appendChild(chevron);
      container.appendChild(pinDisc);

      elementRef.current = container;
      chevronRef.current = chevron;

      markerRef.current = new mapboxgl.Marker({
        element: container,
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    // Shortest angular path calculation for smooth continuous rotation (avoids 359° -> 1° full spins)
    if (chevronRef.current) {
      let currentHeading = heading;
      let prevHeading = prevHeadingRef.current;
      let diff = (currentHeading - prevHeading) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const smoothHeading = prevHeading + diff;
      prevHeadingRef.current = smoothHeading;

      chevronRef.current.style.transform = `rotate(${smoothHeading}deg)`;
    }

    // Update marker styling on mode transitions
    if (elementRef.current) {
      const accuracyRing = elementRef.current.children[0] as HTMLElement;
      const pinDisc = elementRef.current.children[1] as HTMLElement;
      if (pinDisc && accuracyRing) {
        pinDisc.className = getDiscClass();
        accuracyRing.className = getRingClass();
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, latitude, longitude, heading, mode]);

  return null;
};

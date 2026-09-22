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

    const isDr =
      mode.toUpperCase().includes('DEAD_RECKONING') ||
      mode.toUpperCase().includes('INEKF') ||
      mode.toUpperCase().includes('INERTIAL');

    if (!markerRef.current) {
      // Create main marker container
      const container = document.createElement('div');
      container.className = 'relative flex items-center justify-center pointer-events-none select-none';
      container.style.width = '64px';
      container.style.height = '64px';

      // 1. Soft Position Accuracy Footprint Disc
      const accuracyRing = document.createElement('div');
      accuracyRing.className = isDr
        ? 'absolute inset-2 rounded-full bg-amber-500/20 border border-amber-400/40 animate-dr-pulse'
        : 'absolute inset-2 rounded-full bg-sky-500/20 border border-sky-400/40 animate-gnss-pulse';
      container.appendChild(accuracyRing);

      // 2. Core Navigation Marker Disc
      const pinDisc = document.createElement('div');
      pinDisc.className = isDr
        ? 'w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10'
        : 'w-11 h-11 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10';

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

    // Update marker styling when state switches between GNSS and DR
    if (elementRef.current) {
      const accuracyRing = elementRef.current.children[0] as HTMLElement;
      const pinDisc = elementRef.current.children[1] as HTMLElement;
      if (pinDisc && accuracyRing) {
        if (isDr) {
          pinDisc.className = 'w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10';
          accuracyRing.className = 'absolute inset-2 rounded-full bg-amber-500/20 border border-amber-400/40 animate-dr-pulse';
        } else {
          pinDisc.className = 'w-11 h-11 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 border-[3px] border-white shadow-nav-floating flex items-center justify-center text-white z-10';
          accuracyRing.className = 'absolute inset-2 rounded-full bg-sky-500/20 border border-sky-400/40 animate-gnss-pulse';
        }
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

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
  const iconRef = useRef<HTMLDivElement | null>(null);

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
      mode.toUpperCase().includes('DEGRADED');

    if (!markerRef.current) {
      const container = document.createElement('div');
      container.className = 'relative flex items-center justify-center pointer-events-none select-none';
      container.style.width = '48px';
      container.style.height = '48px';

      // Outer radar pulse circle
      const pulseRing = document.createElement('div');
      pulseRing.className = isDr
        ? 'absolute inset-0 rounded-full animate-dr-pulse opacity-75'
        : 'absolute inset-0 rounded-full animate-gnss-pulse opacity-75';
      container.appendChild(pulseRing);

      // Core Vehicle Pin Disc
      const pinDisc = document.createElement('div');
      pinDisc.className = isDr
        ? 'w-10 h-10 rounded-full bg-amber-500 border-[2.5px] border-white shadow-nav-floating flex items-center justify-center text-white transition-colors duration-300 z-10'
        : 'w-10 h-10 rounded-full bg-sky-600 border-[2.5px] border-white shadow-nav-floating flex items-center justify-center text-white transition-colors duration-300 z-10';

      // Heading Arrow Icon
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'transform transition-transform duration-200 ease-out flex items-center justify-center';
      iconWrapper.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2.5L4.5 19.5L6.2 20.8L12 17.5L17.8 20.8L19.5 19.5L12 2.5Z"/>
        </svg>
      `;
      pinDisc.appendChild(iconWrapper);
      container.appendChild(pinDisc);

      elementRef.current = container;
      iconRef.current = iconWrapper;

      markerRef.current = new mapboxgl.Marker({ element: container, rotationAlignment: 'map' })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    if (iconRef.current) {
      iconRef.current.style.transform = `rotate(${heading}deg)`;
    }

    if (elementRef.current) {
      const pinDisc = elementRef.current.children[1] as HTMLElement;
      const pulseRing = elementRef.current.children[0] as HTMLElement;
      if (pinDisc) {
        if (isDr) {
          pinDisc.className = 'w-10 h-10 rounded-full bg-amber-500 border-[2.5px] border-white shadow-nav-floating flex items-center justify-center text-white transition-colors duration-300 z-10';
          if (pulseRing) pulseRing.className = 'absolute inset-0 rounded-full animate-dr-pulse opacity-75';
        } else {
          pinDisc.className = 'w-10 h-10 rounded-full bg-sky-600 border-[2.5px] border-white shadow-nav-floating flex items-center justify-center text-white transition-colors duration-300 z-10';
          if (pulseRing) pulseRing.className = 'absolute inset-0 rounded-full animate-gnss-pulse opacity-75';
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

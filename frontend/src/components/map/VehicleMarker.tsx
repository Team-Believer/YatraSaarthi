import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapContainer';

interface VehicleMarkerProps {
  latitude: number;
  longitude: number;
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

  useEffect(() => {
    if (!map || latitude === 0 || longitude === 0) return;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'w-10 h-10 rounded-full bg-brand-600 border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform duration-300';
      
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'transform transition-transform duration-300';
      iconWrapper.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      `;
      el.appendChild(iconWrapper);

      elementRef.current = el;
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    if (elementRef.current) {
      const icon = elementRef.current.firstElementChild as HTMLElement;
      if (icon) {
        icon.style.transform = `rotate(${heading}deg)`;
      }

      // Update marker ring color depending on mode
      if (mode.includes('DEAD_RECKONING') || mode.includes('DEGRADING')) {
        elementRef.current.className = 'w-10 h-10 rounded-full bg-status-warning border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform duration-300';
      } else {
        elementRef.current.className = 'w-10 h-10 rounded-full bg-brand-600 border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform duration-300';
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

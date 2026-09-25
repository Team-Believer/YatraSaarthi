import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapContainer';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { type SupportedVehicleType, sanitizeVehicleType } from '../../utils/navigation/vehicleProfiles';

interface VehicleMarkerProps {
  latitude: number | null;
  longitude: number | null;
  heading?: number;
  mode?: string;
  vehicleType?: SupportedVehicleType;
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  latitude,
  longitude,
  heading = 0,
  mode = 'GNSS_AIDED',
  vehicleType: propVehicleType,
}) => {
  const map = useMap();
  const storeVehicleType = useSettingsStore((s) => s.settings.vehicle_type);
  const activeVehicleType = sanitizeVehicleType(propVehicleType || storeVehicleType);

  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chevronRef = useRef<HTMLDivElement | null>(null);
  const prevHeadingRef = useRef<number>(heading);
  const prevVehicleRef = useRef<SupportedVehicleType>(activeVehicleType);

  useEffect(() => {
    if (!map || latitude === null || longitude === null || latitude === 0 || longitude === 0) {
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch {}
        markerRef.current = null;
      }
      return;
    }

    try {
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
          return 'w-10 h-10 rounded-full bg-cyan-500 border-2 border-white shadow-nav-floating flex items-center justify-center text-white z-10 transition-colors duration-200';
        }
        if (isDr) {
          return 'w-10 h-10 rounded-full bg-amber-500 border-2 border-white shadow-nav-floating flex items-center justify-center text-white z-10 transition-colors duration-200';
        }
        return 'w-10 h-10 rounded-full bg-[#083335] border-2 border-white shadow-nav-floating flex items-center justify-center text-white z-10 transition-colors duration-200';
      };

      const getRingClass = () => {
        if (isRecovering) {
          return 'absolute inset-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 transition-all duration-300';
        }
        if (isDr) {
          return 'absolute inset-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 transition-all duration-300';
        }
        return 'absolute inset-1.5 rounded-full bg-[#083335]/15 border border-[#083335]/30 transition-all duration-300';
      };

      const getVehicleSvg = (vType: SupportedVehicleType) => {
        if (vType === 'MOTORCYCLE' || vType === 'SCOOTER') {
          return `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2L6 18L12 15.5L18 18L12 2Z"/>
            </svg>
          `;
        }
        // Car / Standard
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2.5L4.5 19.5L6.2 20.8L12 17.5L17.8 20.8L19.5 19.5L12 2.5Z"/>
          </svg>
        `;
      };

      if (!markerRef.current || prevVehicleRef.current !== activeVehicleType) {
        if (markerRef.current) {
          try {
            markerRef.current.remove();
          } catch {}
          markerRef.current = null;
        }
        prevVehicleRef.current = activeVehicleType;

        // Create main marker container
        const container = document.createElement('div');
        container.className = 'relative flex items-center justify-center pointer-events-none select-none';
        container.style.width = '52px';
        container.style.height = '52px';

        // 1. Subtle position accuracy footprint disc
        const accuracyRing = document.createElement('div');
        accuracyRing.className = getRingClass();
        container.appendChild(accuracyRing);

        // 2. Core navigation marker disc
        const pinDisc = document.createElement('div');
        pinDisc.className = getDiscClass();

        // 3. Directional Navigation Chevron
        const chevron = document.createElement('div');
        chevron.className = 'transform transition-transform duration-200 ease-out flex items-center justify-center';
        chevron.style.transformOrigin = 'center center';
        chevron.innerHTML = getVehicleSvg(activeVehicleType);
        pinDisc.appendChild(chevron);
        container.appendChild(pinDisc);

        elementRef.current = container;
        chevronRef.current = chevron;

        if (map.getCanvas()) {
          markerRef.current = new mapboxgl.Marker({
            element: container,
            rotationAlignment: 'map',
            pitchAlignment: 'map',
          })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }
      } else {
        markerRef.current.setLngLat([longitude, latitude]);
      }

      // Shortest angular path calculation for smooth continuous rotation
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
      if (elementRef.current && elementRef.current.children.length >= 2) {
        const accuracyRing = elementRef.current.children[0] as HTMLElement;
        const pinDisc = elementRef.current.children[1] as HTMLElement;
        if (pinDisc && accuracyRing) {
          pinDisc.className = getDiscClass();
          accuracyRing.className = getRingClass();
        }
      }
    } catch (err) {
      console.warn('[VehicleMarker] Update warning:', err);
    }

    return () => {
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch {}
        markerRef.current = null;
      }
    };
  }, [map, latitude, longitude, heading, mode]);

  return null;
};

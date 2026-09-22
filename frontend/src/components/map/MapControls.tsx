import React, { useState } from 'react';
import { useMap } from './MapContainer';
import {
  Layers,
  Compass,
  Box,
  Sun,
  Moon,
  Plus,
  Minus,
  LocateFixed,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { MapOrientationMode } from './MapController';

interface MapControlsProps {
  onRecenter?: () => void;
  onStyleChange?: (style: string) => void;
  onOrientationToggle?: (mode: MapOrientationMode) => void;
  orientationMode?: MapOrientationMode;
  followVehicle?: boolean;
  heading?: number;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onRecenter,
  onStyleChange,
  onOrientationToggle,
  orientationMode = 'HEADING_UP',
  followVehicle = true,
  heading = 0,
  className = 'absolute top-20 right-4 z-20 flex flex-col items-end gap-2.5',
}) => {
  const map = useMap();
  const [showStyles, setShowStyles] = useState(false);
  const [is3D, setIs3D] = useState(true);

  const handleZoomIn = () => {
    if (!map) return;
    map.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    if (!map) return;
    map.zoomOut({ duration: 300 });
  };

  const handleStyleSelect = (styleUrl: string) => {
    if (map) {
      map.setStyle(styleUrl);
    }
    if (onStyleChange) {
      onStyleChange(styleUrl);
    }
    setShowStyles(false);
  };

  const handleToggle3D = () => {
    if (!map) return;
    const newPitch = is3D ? 0 : 55;
    map.easeTo({
      pitch: newPitch,
      duration: 500,
    });
    setIs3D(!is3D);
  };

  const handleToggleOrientation = () => {
    const nextMode: MapOrientationMode =
      orientationMode === 'HEADING_UP' ? 'NORTH_UP' : 'HEADING_UP';
    if (onOrientationToggle) {
      onOrientationToggle(nextMode);
    }
  };

  return (
    <div className={className}>
      {/* Prominent Recenter Pill when camera has panned away */}
      {!followVehicle && onRecenter && (
        <button
          type="button"
          onClick={onRecenter}
          aria-label="Recenter map on vehicle"
          className="h-11 px-4 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium flex items-center gap-2 shadow-nav-floating transition-colors select-none active:scale-[0.97] cursor-pointer"
        >
          <LocateFixed className="w-4 h-4 text-white shrink-0" />
          <span>Recenter</span>
        </button>
      )}

      {/* Style Picker Dropdown */}
      {showStyles && (
        <div className="bg-white p-1.5 rounded-2xl border border-border-clean shadow-nav-floating space-y-1 text-xs select-none min-w-[160px]">
          <button
            type="button"
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-day-v1')}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sun className="w-4 h-4 text-ink" />
            <span>Navigation Day</span>
          </button>
          <button
            type="button"
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-night-v1')}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Moon className="w-4 h-4 text-ink" />
            <span>Navigation Night</span>
          </button>
          <button
            type="button"
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/streets-v12')}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors cursor-pointer"
          >
            Standard Streets
          </button>
          <button
            type="button"
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/satellite-streets-v12')}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors cursor-pointer"
          >
            Satellite Hybrid
          </button>
        </div>
      )}

      {/* Group 1: Zoom In / Zoom Out */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating flex flex-col p-0.5 overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-canvas-soft text-ink transition-colors cursor-pointer select-none active:scale-[0.96]"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>
        <div className="h-px bg-border-clean mx-1.5" />
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-canvas-soft text-ink transition-colors cursor-pointer select-none active:scale-[0.96]"
        >
          <Minus className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Group 2: Orientation / Compass */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-0.5 flex flex-col items-center">
        <button
          type="button"
          onClick={handleToggleOrientation}
          aria-label={
            orientationMode === 'HEADING_UP'
              ? 'Orientation: Heading-Up. Click to switch to North-Up'
              : 'Orientation: North-Up. Click to switch to Heading-Up'
          }
          title={
            orientationMode === 'HEADING_UP'
              ? 'Orientation: Heading-Up'
              : 'Orientation: North-Up'
          }
          className={clsx(
            'w-11 h-11 rounded-xl flex items-center justify-center relative transition-colors cursor-pointer select-none active:scale-[0.96]',
            orientationMode === 'HEADING_UP'
              ? 'bg-canvas-softer text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Compass
            className="w-4.5 h-4.5 transition-transform duration-300 text-ink"
            style={{
              transform: orientationMode === 'HEADING_UP' ? `rotate(-${heading}deg)` : 'rotate(0deg)',
            }}
          />
          <span className="absolute bottom-1 right-1 text-[7px] font-bold tracking-tight leading-none text-ink">
            {orientationMode === 'HEADING_UP' ? 'HDG' : 'N'}
          </span>
        </button>
      </div>

      {/* Group 3: 3D Perspective & Map Layers */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-0.5 flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleToggle3D}
          aria-label={is3D ? 'Switch to 2D view' : 'Switch to 3D perspective'}
          title={is3D ? '3D Navigation Perspective' : '2D Top-Down View'}
          className={clsx(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96]',
            is3D
              ? 'bg-canvas-softer text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Box className="w-4.5 h-4.5 text-ink" />
        </button>
        <div className="h-px w-8 bg-border-clean mx-auto" />
        <button
          type="button"
          onClick={() => setShowStyles(!showStyles)}
          aria-label="Toggle map layers and styles"
          title="Change map style"
          className={clsx(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96]',
            showStyles
              ? 'bg-canvas-softer text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Layers className="w-4.5 h-4.5 text-ink" />
        </button>
      </div>

      {/* Group 4: Standard Recenter button when already centered */}
      {followVehicle && onRecenter && (
        <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-0.5 flex flex-col items-center">
          <button
            type="button"
            onClick={onRecenter}
            aria-label="Center camera on vehicle"
            title="Centered on vehicle"
            className="w-11 h-11 rounded-xl bg-canvas-soft text-ink hover:bg-surface-pressed transition-colors flex items-center justify-center cursor-pointer select-none active:scale-[0.96]"
          >
            <LocateFixed className="w-4.5 h-4.5 text-ink" />
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useMap } from './MapContainer';
import {
  Layers,
  Crosshair,
  Compass,
  Box,
  Sun,
  Moon,
  Plus,
  Minus,
  Navigation,
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
      {/* Prominent Recenter Button (Highlights whenever follow is suspended) */}
      {!followVehicle && onRecenter && (
        <button
          onClick={onRecenter}
          className="btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-nav-floating animate-in fade-in slide-in-from-right-2 select-none"
        >
          <Navigation className="w-3.5 h-3.5 fill-white rotate-[-20deg]" />
          <span>Recenter</span>
        </button>
      )}

      {/* Style Picker Dropdown */}
      {showStyles && (
        <div className="bg-white p-1.5 rounded-2xl border border-border-clean shadow-nav-floating space-y-1 text-xs select-none animate-in fade-in zoom-in-95 duration-150 min-w-[160px]">
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-day-v1')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Navigation Day</span>
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-night-v1')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Navigation Night</span>
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/streets-v12')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors cursor-pointer"
          >
            Standard Streets
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/satellite-streets-v12')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors cursor-pointer"
          >
            Satellite Hybrid
          </button>
        </div>
      )}

      {/* Main Map Navigation Control Cluster */}
      <div className="flex flex-col gap-1 bg-white p-1.5 rounded-2xl border border-border-clean shadow-nav-floating select-none">
        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          title="Zoom in"
          className="p-2.5 rounded-xl hover:bg-canvas-soft text-ink transition-colors press-scale flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          className="p-2.5 rounded-xl hover:bg-canvas-soft text-ink transition-colors press-scale flex items-center justify-center border-b border-border-clean pb-2 mb-1 cursor-pointer"
        >
          <Minus className="w-4.5 h-4.5" />
        </button>

        {/* Dynamic Heading / North-Up Orientation Toggle */}
        <button
          onClick={handleToggleOrientation}
          title={
            orientationMode === 'HEADING_UP'
              ? 'Orientation: Heading-Up (Click for North-Up)'
              : 'Orientation: North-Up (Click for Heading-Up)'
          }
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center relative cursor-pointer',
            orientationMode === 'HEADING_UP'
              ? 'bg-canvas-soft text-ink font-semibold'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Compass
            className="w-4.5 h-4.5 transition-transform duration-300 text-ink"
            style={{
              transform: orientationMode === 'HEADING_UP' ? `rotate(-${heading}deg)` : 'rotate(0deg)',
            }}
          />
          <span className="absolute bottom-1 right-1 text-[8px] font-bold leading-none text-ink">
            {orientationMode === 'HEADING_UP' ? 'HDG' : 'N'}
          </span>
        </button>

        {/* 3D / 2D Perspective Pitch Toggle */}
        <button
          onClick={handleToggle3D}
          title={is3D ? '3D Navigation Perspective' : '2D Top-Down View'}
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center text-xs font-semibold cursor-pointer',
            is3D
              ? 'bg-canvas-soft text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Box className="w-4.5 h-4.5" />
        </button>

        {/* Style Switcher Toggle */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          title="Change Map Layers & Style"
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center cursor-pointer',
            showStyles
              ? 'bg-canvas-soft text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        {/* Standard Recenter Toggle (when already following) */}
        {followVehicle && onRecenter && (
          <button
            onClick={onRecenter}
            title="Centered on Vehicle"
            className="p-2.5 rounded-xl bg-canvas-soft text-ink hover:bg-surface-pressed transition-colors press-scale flex items-center justify-center border-t border-border-clean mt-1 pt-2 cursor-pointer"
          >
            <Crosshair className="w-4.5 h-4.5 text-ink" />
          </button>
        )}
      </div>
    </div>
  );
};

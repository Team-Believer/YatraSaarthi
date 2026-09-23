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
          className="group relative w-11 h-11 flex items-center justify-center rounded-xl hover:bg-canvas-soft text-ink transition-colors cursor-pointer select-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <Plus className="w-4.5 h-4.5" />
          <div className="absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            Zoom in
          </div>
        </button>
        <div className="h-px bg-border-clean mx-1.5" />
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="group relative w-11 h-11 flex items-center justify-center rounded-xl hover:bg-canvas-soft text-ink transition-colors cursor-pointer select-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <Minus className="w-4.5 h-4.5" />
          <div className="absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            Zoom out
          </div>
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
          className={clsx(
            'group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
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
          <div className="absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            {orientationMode === 'HEADING_UP' ? 'Orient north' : 'Heading up'}
          </div>
        </button>
      </div>

      {/* Group 3: 3D Perspective & Map Layers */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-0.5 flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleToggle3D}
          aria-label={is3D ? 'Switch to 2D view' : 'Switch to 3D perspective'}
          className={clsx(
            'group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
            is3D
              ? 'bg-canvas-softer text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Box className="w-4.5 h-4.5 text-ink" />
          <div className="absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            {is3D ? '2D view' : '3D perspective'}
          </div>
        </button>
        <div className="h-px w-8 bg-border-clean mx-auto" />
        <button
          type="button"
          onClick={() => setShowStyles(!showStyles)}
          aria-label="Toggle map layers and styles"
          className={clsx(
            'group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
            showStyles
              ? 'bg-canvas-softer text-ink'
              : 'hover:bg-canvas-soft text-ink-body hover:text-ink'
          )}
        >
          <Layers className="w-4.5 h-4.5 text-ink" />
          <div className="absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            Map styles
          </div>
        </button>
      </div>

      {/* Group 4: Standard Recenter button when already centered */}
      {followVehicle && onRecenter && (
        <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-0.5 flex flex-col items-center">
          <button
            type="button"
            onClick={onRecenter}
            aria-label="Center camera on vehicle"
            className="group relative w-11 h-11 rounded-xl bg-canvas-soft text-ink hover:bg-surface-pressed transition-colors flex items-center justify-center cursor-pointer select-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <LocateFixed className="w-4.5 h-4.5 text-ink" />
            <div className="absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
              Recenter
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

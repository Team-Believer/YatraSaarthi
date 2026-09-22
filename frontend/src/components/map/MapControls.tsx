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
          className="bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2.5 rounded-2xl shadow-nav-floating flex items-center gap-2 text-xs font-bold transition-all press-scale animate-in fade-in slide-in-from-right-2 border border-brand-400/40 select-none"
        >
          <Navigation className="w-4 h-4 fill-white rotate-[-20deg]" />
          <span>Recenter</span>
        </button>
      )}

      {/* Style Picker Dropdown */}
      {showStyles && (
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-nav-floating space-y-1 text-xs select-none animate-in fade-in zoom-in-95 duration-150 min-w-[160px]">
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-day-v1')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 font-semibold text-slate-800 transition-colors flex items-center gap-2"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Navigation Day</span>
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-night-v1')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 font-semibold text-slate-800 transition-colors flex items-center gap-2"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Navigation Night</span>
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/streets-v12')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
          >
            Standard Streets
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/satellite-streets-v12')}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
          >
            Satellite Hybrid
          </button>
        </div>
      )}

      {/* Main Map Navigation Control Cluster */}
      <div className="flex flex-col gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-nav-floating select-none">
        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          title="Zoom in"
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors press-scale flex items-center justify-center"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors press-scale flex items-center justify-center border-b border-slate-100 pb-2 mb-1"
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
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center relative',
            orientationMode === 'HEADING_UP'
              ? 'bg-brand-50 text-brand-700 font-semibold'
              : 'hover:bg-slate-100 text-slate-700'
          )}
        >
          <Compass
            className="w-4.5 h-4.5 transition-transform duration-300"
            style={{
              transform: orientationMode === 'HEADING_UP' ? `rotate(-${heading}deg)` : 'rotate(0deg)',
            }}
          />
          <span className="absolute bottom-1 right-1 text-[8px] font-bold leading-none">
            {orientationMode === 'HEADING_UP' ? 'HDG' : 'N'}
          </span>
        </button>

        {/* 3D / 2D Perspective Pitch Toggle */}
        <button
          onClick={handleToggle3D}
          title={is3D ? '3D Navigation Perspective' : '2D Top-Down View'}
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center text-xs font-bold',
            is3D
              ? 'bg-brand-50 text-brand-700'
              : 'hover:bg-slate-100 text-slate-700'
          )}
        >
          <Box className="w-4.5 h-4.5" />
        </button>

        {/* Style Switcher Toggle */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          title="Change Map Layers & Style"
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center',
            showStyles
              ? 'bg-brand-50 text-brand-700'
              : 'hover:bg-slate-100 text-slate-700 hover:text-brand-600'
          )}
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        {/* Standard Recenter Toggle (when already following) */}
        {followVehicle && onRecenter && (
          <button
            onClick={onRecenter}
            title="Centered on Vehicle"
            className="p-2.5 rounded-xl bg-slate-50 text-brand-600 hover:bg-slate-100 transition-colors press-scale flex items-center justify-center border-t border-slate-100 mt-1 pt-2"
          >
            <Crosshair className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </div>
  );
};

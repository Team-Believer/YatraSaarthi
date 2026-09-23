import React, { useState } from 'react';
import { useMap } from './MapContainer';
import {
  Layers,
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
  followVehicle = true,
  className = 'absolute top-[44%] -translate-y-1/2 right-3 sm:right-4 z-20 flex flex-col items-end gap-2',
}) => {
  const map = useMap();
  const [showStyles, setShowStyles] = useState(false);

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

  return (
    <div className={className}>
      {/* Style Picker Dropdown */}
      {showStyles && (
        <div className="bg-white p-1.5 rounded-2xl border border-border-clean shadow-nav-floating space-y-1 text-xs select-none min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-day-v1')}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sun className="w-4 h-4 text-[#083335]" />
            <span>Navigation Day</span>
          </button>
          <button
            type="button"
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/navigation-night-v1')}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-canvas-soft font-medium text-ink transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Moon className="w-4 h-4 text-[#083335]" />
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

      {/* Control 1: Locate / Recenter (44-48px compact white floating button) */}
      {onRecenter && (
        <button
          type="button"
          onClick={onRecenter}
          aria-label="Recenter map"
          title="Recenter map"
          className={clsx(
            'group relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white hover:bg-canvas-soft border border-border-clean shadow-nav-floating flex items-center justify-center transition-all cursor-pointer select-none active:scale-[0.95]',
            !followVehicle && 'ring-2 ring-[#083335]/40'
          )}
        >
          <LocateFixed className="w-5 h-5 text-[#083335]" />
          <div className="hidden md:block absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-ink text-xs font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            Recenter
          </div>
        </button>
      )}

      {/* Controls 2 & 3: Zoom In & Zoom Out Stack */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating flex flex-col p-0.5 overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="group relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-canvas-soft text-ink transition-colors cursor-pointer select-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]"
        >
          <Plus className="w-5 h-5 text-[#083335]" />
          <div className="hidden md:block absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-ink text-xs font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            Zoom in
          </div>
        </button>
        <div className="h-px bg-border-clean mx-1.5" />
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="group relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-canvas-soft text-ink transition-colors cursor-pointer select-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]"
        >
          <Minus className="w-5 h-5 text-[#083335]" />
          <div className="hidden md:block absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-ink text-xs font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
            Zoom out
          </div>
        </button>
      </div>

      {/* Control 4: Map Layers & Styles */}
      <button
        type="button"
        onClick={() => setShowStyles(!showStyles)}
        aria-label="Toggle map layers and styles"
        title="Map styles"
        className={clsx(
          'group relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border border-border-clean shadow-nav-floating flex items-center justify-center transition-all cursor-pointer select-none active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]',
          showStyles ? 'bg-canvas-softer text-ink' : 'bg-white hover:bg-canvas-soft text-ink'
        )}
      >
        <Layers className="w-5 h-5 text-[#083335]" />
        <div className="hidden md:block absolute right-full mr-3 px-3 py-1 bg-white border border-slate-200/90 text-ink text-xs font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50">
          Map styles
        </div>
      </button>
    </div>
  );
};

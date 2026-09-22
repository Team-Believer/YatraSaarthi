import React, { useState } from 'react';
import { useMap } from './MapContainer';
import { Layers, Crosshair, Compass, Box, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';

interface MapControlsProps {
  onRecenter?: () => void;
  onStyleChange?: (style: string) => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onRecenter,
  onStyleChange,
  className = 'absolute top-20 right-4 z-20 flex flex-col items-end gap-2',
}) => {
  const map = useMap();
  const [showStyles, setShowStyles] = useState(false);
  const [is3D, setIs3D] = useState(true);

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
      duration: 600,
    });
    setIs3D(!is3D);
  };

  const handleResetNorth = () => {
    if (!map) return;
    map.easeTo({
      bearing: 0,
      duration: 600,
    });
  };

  return (
    <div className={className}>
      {/* Style Picker Dropdown Menu */}
      {showStyles && (
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-nav-floating space-y-1 text-xs select-none animate-in fade-in zoom-in-95 duration-150 mb-1 min-w-[150px]">
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

      {/* Control Buttons Stack */}
      <div className="flex flex-col gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-nav-floating">
        {/* Reset North / Compass */}
        <button
          onClick={handleResetNorth}
          title="Reset Bearing to North"
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-brand-600 transition-colors press-scale flex items-center justify-center"
        >
          <Compass className="w-4.5 h-4.5" />
        </button>

        {/* 3D / 2D Perspective Toggle */}
        <button
          onClick={handleToggle3D}
          title={is3D ? 'Switch to 2D Top-Down View' : 'Switch to 3D Navigation Perspective'}
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center font-bold text-xs',
            is3D
              ? 'bg-brand-50 text-brand-700 border border-brand-200/60'
              : 'hover:bg-slate-100 text-slate-700'
          )}
        >
          <Box className="w-4.5 h-4.5" />
        </button>

        {/* Map Layers / Style Toggle */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          title="Change Map Style"
          className={clsx(
            'p-2.5 rounded-xl transition-colors press-scale flex items-center justify-center',
            showStyles
              ? 'bg-brand-50 text-brand-700'
              : 'hover:bg-slate-100 text-slate-700 hover:text-brand-600'
          )}
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        {/* Recenter Button */}
        {onRecenter && (
          <button
            onClick={onRecenter}
            title="Recenter Camera on Vehicle"
            className="p-2.5 rounded-xl hover:bg-slate-100 text-brand-600 hover:text-brand-700 transition-colors press-scale flex items-center justify-center"
          >
            <Crosshair className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </div>
  );
};

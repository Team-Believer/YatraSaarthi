import React, { useState } from 'react';
import { useMap } from './MapContainer';
import { Layers, Crosshair } from 'lucide-react';

interface MapControlsProps {
  onRecenter?: () => void;
  onStyleChange?: (style: string) => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onRecenter,
  onStyleChange,
  className = 'absolute bottom-4 right-4 z-10',
}) => {
  const map = useMap();
  const [showStyles, setShowStyles] = useState(false);

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
    <div className={`flex flex-col gap-2 ${className}`}>
      {showStyles && (
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-md space-y-0.5 text-xs select-none animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/streets-v12')}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-800 transition-colors"
          >
            Streets Light
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/light-v11')}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-800 transition-colors"
          >
            Clean Light
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/satellite-streets-v12')}
            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-800 transition-colors"
          >
            Satellite
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowStyles(!showStyles)}
          title="Change Map Style"
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200/90 shadow-xs transition-all flex items-center justify-center hover:text-brand-600"
        >
          <Layers className="w-4 h-4" />
        </button>

        {onRecenter && (
          <button
            onClick={onRecenter}
            title="Recenter Position"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200/90 shadow-xs transition-all flex items-center gap-1.5 font-semibold text-xs hover:text-brand-600"
          >
            <Crosshair className="w-4 h-4 text-brand-600" />
            <span>Recenter</span>
          </button>
        )}
      </div>
    </div>
  );
};


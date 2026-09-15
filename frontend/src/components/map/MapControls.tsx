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
  className = 'absolute bottom-6 left-6 z-10',
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
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-brand-100 shadow-xl space-y-1 text-xs">
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/streets-v12')}
            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-brand-50 font-semibold text-brand-navy"
          >
            Streets Light
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/light-v11')}
            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-brand-50 font-semibold text-brand-navy"
          >
            Clean Light
          </button>
          <button
            onClick={() => handleStyleSelect('mapbox://styles/mapbox/satellite-streets-v12')}
            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-brand-50 font-semibold text-brand-navy"
          >
            Satellite
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowStyles(!showStyles)}
          title="Change Map Style"
          className="p-3 bg-white hover:bg-brand-50 text-brand-navy rounded-2xl border border-brand-100 shadow-lg transition-all"
        >
          <Layers className="w-5 h-5 text-brand-600" />
        </button>

        {onRecenter && (
          <button
            onClick={onRecenter}
            title="Recenter Position"
            className="p-3 bg-white hover:bg-brand-50 text-brand-navy rounded-2xl border border-brand-100 shadow-lg transition-all flex items-center gap-2 font-semibold text-xs"
          >
            <Crosshair className="w-5 h-5 text-brand-600" />
            <span>Recenter</span>
          </button>
        )}
      </div>
    </div>
  );
};

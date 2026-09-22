import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';

import { useRouteStore } from '../../stores/useRouteStore';
import { routeService } from '../../services/navigation/routeService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface SearchResult {
  id: string;
  name: string;
  place_formatted: string;
  coordinates: [number, number]; // [lon, lat]
}

export const DestinationSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { latitude: currentLat, longitude: currentLon } = useLocationStore();
  const { destination, setDestination, setRouteCoordinates } = useNavigationStore();

  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const proximity = currentLat && currentLon ? `&proximity=${currentLon},${currentLat}` : '';
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
            query
          )}&access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5${proximity}`
        );
        const data = await res.json();
        
        if (data.features) {
          setResults(
            data.features.map((f: any) => ({
              id: f.id,
              name: f.properties.name || f.properties.name_preferred,
              place_formatted: f.properties.place_formatted || f.properties.context?.country?.name || '',
              coordinates: f.geometry.coordinates,
            }))
          );
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, currentLat, currentLon]);

  const handleSelect = (result: SearchResult) => {
    setDestination({ name: result.name, coordinates: result.coordinates });
    setQuery(result.name);
    setIsOpen(false);
    const travelMode = useRouteStore.getState().travelMode;
    routeService.calculateRoutes(result.coordinates, travelMode);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setDestination(null);
    setRouteCoordinates(null);
    useRouteStore.getState().clearRoute();
  };

  const handleBackOrClear = () => {
    handleClear();
  };

  return (
    <div className="relative w-full max-w-[560px]">
      <div className="bg-white px-3 sm:px-4 h-[52px] sm:h-14 rounded-full border border-border-clean shadow-nav-floating flex items-center gap-3 transition-all duration-150 focus-within:border-black focus-within:ring-1 focus-within:ring-black/10">
        {destination ? (
          <button
            type="button"
            onClick={handleBackOrClear}
            aria-label="Clear destination and search again"
            className="w-9 h-9 rounded-full bg-canvas-soft hover:bg-surface-pressed flex items-center justify-center shrink-0 text-ink transition-colors cursor-pointer active:scale-95"
            title="Clear destination"
          >
            <span className="text-lg font-bold leading-none select-none">←</span>
          </button>
        ) : (
          <div className="w-9 h-9 rounded-full bg-canvas-soft flex items-center justify-center shrink-0 text-ink select-none">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-ink animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-ink stroke-[2.2]" />
            )}
          </div>
        )}

        <input
          type="text"
          aria-label="Search destination"
          value={destination ? (query || destination.name) : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (destination) {
              setDestination(null);
              setRouteCoordinates(null);
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            if (destination && !query) {
              setQuery(destination.name);
            }
          }}
          placeholder="Where to?"
          className="flex-1 bg-transparent border-none focus:outline-none text-ink font-medium placeholder:text-[#5E5E5E] placeholder:font-normal text-base w-full min-w-0"
        />

        {(query || destination) && (
          <button
            type="button"
            onClick={handleClear}
            className="w-9 h-9 min-w-[36px] hover:bg-canvas-soft rounded-full text-ink-body hover:text-ink transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2.5 bg-white rounded-2xl shadow-nav-floating border border-border-clean overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-canvas-softer transition-colors text-left border-b border-border-clean last:border-0 group cursor-pointer"
            >
              <div className="w-9 h-9 bg-canvas-soft rounded-full flex items-center justify-center shrink-0 text-ink group-hover:bg-black group-hover:text-white transition-colors">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink text-sm sm:text-[15px] truncate leading-snug">
                  {result.name}
                </div>
                <div className="text-xs text-[#5E5E5E] truncate mt-0.5">
                  {result.place_formatted}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

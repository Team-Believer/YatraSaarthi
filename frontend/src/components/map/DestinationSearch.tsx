import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation as NavIcon, X, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';

import { useRouteStore } from '../../stores/useRouteStore';

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

  const fetchRoute = async (destCoords: [number, number]) => {
    if (!currentLat || !currentLon) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLon},${currentLat};${destCoords[0]},${destCoords[1]}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteCoordinates(route.geometry.coordinates);

        let parsedSteps: any[] = [];
        if (route.legs && route.legs.length > 0 && route.legs[0].steps) {
          parsedSteps = route.legs[0].steps.map((s: any) => ({
            instruction: s.maneuver?.instruction || s.name || '',
            distance_m: s.distance || 0,
            duration_s: s.duration || 0,
            name: s.name || '',
            type: s.maneuver?.type,
            modifier: s.maneuver?.modifier,
          }));
        }

        useRouteStore.getState().setRoute({
          origin: [currentLon, currentLat],
          destination: destCoords,
          distance_meters: route.distance,
          duration_seconds: route.duration,
          geometry: route.geometry.coordinates,
          steps: parsedSteps,
        });
      }
    } catch (err) {
      console.error('Route error:', err);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setDestination({ name: result.name, coordinates: result.coordinates });
    setQuery(result.name);
    setIsOpen(false);
    fetchRoute(result.coordinates);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setDestination(null);
    setRouteCoordinates(null);
    useRouteStore.getState().clearRoute();
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="bg-white px-4 h-12 md:h-13 rounded-full border border-border-clean shadow-nav-floating flex items-center gap-3 transition-all duration-150 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
        <div className="w-8 h-8 rounded-full bg-canvas-soft flex items-center justify-center shrink-0 text-ink">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-ink animate-spin" />
          ) : destination ? (
            <NavIcon className="w-4 h-4 text-ink fill-ink" />
          ) : (
            <Search className="w-4 h-4 text-ink" />
          )}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (destination) {
              setDestination(null);
              setRouteCoordinates(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Where to?"
          className="flex-1 bg-transparent border-none focus:outline-none text-ink font-normal placeholder:text-ink-mute text-xs md:text-sm w-full"
        />

        {query && (
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-canvas-soft rounded-full text-ink-body hover:text-ink transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-nav-floating border border-border-clean overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas-softer transition-colors text-left border-b border-border-clean last:border-0 group cursor-pointer"
            >
              <div className="w-8 h-8 bg-canvas-soft rounded-full flex items-center justify-center shrink-0 text-ink group-hover:bg-black group-hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink truncate text-xs md:text-sm">{result.name}</div>
                <div className="text-[11px] text-ink-body truncate mt-0.5">{result.place_formatted}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

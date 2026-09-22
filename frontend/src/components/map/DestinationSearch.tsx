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
        `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLon},${currentLat};${destCoords[0]},${destCoords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteCoordinates(route.geometry.coordinates);
        useRouteStore.getState().setRoute({
          origin: [currentLon, currentLat],
          destination: destCoords,
          distance_meters: route.distance,
          duration_seconds: route.duration,
          geometry: route.geometry.coordinates,
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
      <div className="bg-white/95 backdrop-blur-md px-3.5 h-12 md:h-13 rounded-2xl border border-slate-200/90 shadow-nav-floating flex items-center gap-2.5 transition-all duration-150 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
          ) : destination ? (
            <NavIcon className="w-4 h-4 text-brand-600 fill-brand-600" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
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
          placeholder="Where to? (Search destination)"
          className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium placeholder:font-normal placeholder:text-slate-400 text-xs md:text-sm w-full"
        />

        {query && (
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-nav-floating border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0 group"
            >
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 truncate text-xs md:text-sm">{result.name}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{result.place_formatted}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation as NavIcon, X, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';

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
        setRouteCoordinates(data.routes[0].geometry.coordinates);
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
  };

  return (
    <div className="relative w-full">
      <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl md:rounded-3xl border border-brand-100 shadow-xl flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
          ) : destination ? (
            <NavIcon className="w-5 h-5 text-brand-600 fill-brand-600" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
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
          className="flex-1 bg-transparent border-none focus:outline-none text-brand-navy font-semibold placeholder:font-normal placeholder:text-gray-400 text-sm md:text-base w-full"
        />

        {query && (
          <button onClick={handleClear} className="p-2 hover:bg-gray-100 rounded-full mr-1 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-brand-100 overflow-hidden z-50">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-4 p-4 hover:bg-brand-50 transition-colors text-left border-b border-gray-50 last:border-0"
            >
              <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center shrink-0 text-brand-600">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-brand-navy truncate text-sm">{result.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{result.place_formatted}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

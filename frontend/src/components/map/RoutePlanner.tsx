import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  X,
  Loader2,
  ArrowUpDown,
  Navigation,
  Bookmark,
  Map as MapIcon,
} from 'lucide-react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useRouteStore } from '../../stores/useRouteStore';
import { routeService } from '../../services/navigation/routeService';
import { savedRouteService, type SavedPlaceItem } from '../../services/navigation/savedRouteService';
import { clsx } from 'clsx';

const MAPBOX_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_MAPBOX_TOKEN : '') ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_MAPBOX_TOKEN : '') ||
  '';

interface SearchResult {
  id: string;
  name: string;
  place_formatted: string;
  coordinates: [number, number]; // [lon, lat]
}

interface RoutePlannerProps {
  onPickOnMap?: (field: 'source' | 'destination') => void;
  className?: string;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  onPickOnMap,
  className,
}) => {
  // Navigation & Location Store state
  const {
    source,
    destination,
    setSource,
    setDestination,
    setRouteCoordinates,
  } = useNavigationStore();

  const {
    latitude: currentLat,
    longitude: currentLon,
    placeName: currentPlaceName,
  } = useLocationStore();

  const travelMode = useRouteStore((s) => s.travelMode);
  const clearRoute = useRouteStore((s) => s.clearRoute);

  // Active input focus: 'source' | 'destination' | null
  const [activeField, setActiveField] = useState<'source' | 'destination' | null>(null);

  // Input query values
  const [sourceQuery, setSourceQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');

  // Search results & loading
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saved items for quick suggestions
  const [savedItems, setSavedItems] = useState<SavedPlaceItem[]>(() =>
    savedRouteService.getSavedItems()
  );

  // Sync saved places
  useEffect(() => {
    return savedRouteService.subscribe((items) => {
      setSavedItems(items);
    });
  }, []);

  // Synchronize inputs with store when source/destination change externally
  useEffect(() => {
    if (source) {
      setSourceQuery(source.name);
    } else {
      setSourceQuery('Your location');
    }
  }, [source]);

  useEffect(() => {
    if (destination) {
      setDestQuery(destination.name);
    } else {
      setDestQuery('');
    }
  }, [destination]);

  // Debounced search when active field query changes
  const activeQuery = activeField === 'source' ? sourceQuery : destQuery;

  useEffect(() => {
    if (!activeField) {
      setResults([]);
      return;
    }

    const trimmed = activeQuery.trim();
    if (!trimmed || trimmed === 'Your location' || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const proximity = currentLat && currentLon ? `&proximity=${currentLon},${currentLat}` : '';
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
            trimmed
          )}&access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5${proximity}`
        );
        const data = await res.json();

        if (data.features) {
          setResults(
            data.features.map((f: any) => ({
              id: f.id,
              name: f.properties.name || f.properties.name_preferred || f.properties.place_formatted,
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
    }, 350);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [activeQuery, activeField, currentLat, currentLon]);

  // Trigger route calculation when source/dest are valid
  const triggerRecalculate = useCallback(
    (
      newSource: { name: string; coordinates: [number, number]; isCurrentLocation?: boolean } | null,
      newDest: { name: string; coordinates: [number, number] } | null
    ) => {
      if (!newDest?.coordinates) {
        setRouteCoordinates(null);
        clearRoute();
        return;
      }

      let originCoords: [number, number] | undefined = undefined;
      if (newSource?.coordinates) {
        originCoords = newSource.coordinates;
      } else if (currentLon !== null && currentLat !== null) {
        originCoords = [currentLon, currentLat];
      }

      if (originCoords) {
        routeService.calculateRoutes(newDest.coordinates, travelMode, originCoords);
      }
    },
    [currentLat, currentLon, travelMode, setRouteCoordinates, clearRoute]
  );

  // Handle selecting a place result
  const handleSelectResult = (result: SearchResult) => {
    if (activeField === 'source') {
      const newSource = {
        name: result.name,
        coordinates: result.coordinates,
        isCurrentLocation: false,
      };
      setSource(newSource);
      setSourceQuery(result.name);
      setActiveField(null);
      triggerRecalculate(newSource, destination);
    } else {
      const newDest = {
        name: result.name,
        coordinates: result.coordinates,
      };
      setDestination(newDest);
      setDestQuery(result.name);
      setActiveField(null);
      triggerRecalculate(source, newDest);
    }
  };

  // Handle selecting "Your location"
  const handleSelectCurrentLocation = () => {
    const locName = currentPlaceName || 'Your location';
    let newSource: { name: string; coordinates: [number, number]; isCurrentLocation: boolean } | null = null;

    if (currentLon !== null && currentLat !== null) {
      newSource = {
        name: locName,
        coordinates: [currentLon, currentLat],
        isCurrentLocation: true,
      };
    }

    setSource(newSource);
    setSourceQuery('Your location');
    setActiveField(null);
    triggerRecalculate(newSource, destination);
  };

  // Handle selecting a saved place
  const handleSelectSavedPlace = (place: SavedPlaceItem) => {
    if (activeField === 'source') {
      const newSource = {
        name: place.name,
        coordinates: place.coordinates,
        isCurrentLocation: false,
      };
      setSource(newSource);
      setSourceQuery(place.name);
      setActiveField(null);
      triggerRecalculate(newSource, destination);
    } else {
      const newDest = {
        name: place.name,
        coordinates: place.coordinates,
      };
      setDestination(newDest);
      setDestQuery(place.name);
      setActiveField(null);
      triggerRecalculate(source, newDest);
    }
  };

  // Handle swapping Source and Destination
  const handleSwap = () => {
    const currentSourceObj =
      source ||
      (currentLon !== null && currentLat !== null
        ? { name: 'Your location', coordinates: [currentLon, currentLat] as [number, number], isCurrentLocation: true }
        : null);

    const currentDestObj = destination;

    if (!currentSourceObj && !currentDestObj) return;

    const nextSource = currentDestObj
      ? {
          name: currentDestObj.name,
          coordinates: currentDestObj.coordinates,
          isCurrentLocation: false,
        }
      : null;

    const nextDest = currentSourceObj
      ? {
          name: currentSourceObj.name,
          coordinates: currentSourceObj.coordinates,
        }
      : null;

    setSource(nextSource);
    setDestination(nextDest);

    if (nextSource) setSourceQuery(nextSource.name);
    else setSourceQuery('Your location');

    if (nextDest) setDestQuery(nextDest.name);
    else setDestQuery('');

    setActiveField(null);
    triggerRecalculate(nextSource, nextDest);
  };

  // Handle clearing source field
  const handleClearSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSource(null);
    setSourceQuery('');
    setActiveField('source');
  };

  // Handle clearing destination field
  const handleClearDest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDestination(null);
    setDestQuery('');
    setRouteCoordinates(null);
    clearRoute();
    setActiveField('destination');
  };

  // Handle map picking mode
  const handlePickOnMap = (field: 'source' | 'destination') => {
    setActiveField(null);
    if (onPickOnMap) {
      onPickOnMap(field);
    }
  };

  const isDropdownOpen = !!activeField;

  return (
    <div className={clsx('relative w-full select-none font-body', className)}>
      {/* Compact Single Floating Input Surface (72-76px height) */}
      <div className="bg-white/98 backdrop-blur-md rounded-2xl border border-[#E2E8E7] shadow-[0_6px_24px_rgba(8,51,53,0.08)] px-3 py-1.5 transition-all duration-150 focus-within:border-[#083335]/40 focus-within:ring-1 focus-within:ring-[#083335]/10">
        <div className="flex items-center gap-2">
          {/* Stacked 2 Input Rows */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Row 1: Source (Your location) */}
            <div className="flex items-center gap-2 h-[34px] min-w-0 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <input
                type="text"
                aria-label="Starting location"
                value={sourceQuery}
                onFocus={() => {
                  setActiveField('source');
                  if (sourceQuery === 'Your location') {
                    setSourceQuery('');
                  }
                }}
                onChange={(e) => setSourceQuery(e.target.value)}
                placeholder="Choose starting point"
                className="w-full bg-transparent border-none focus:outline-none text-[#083335] text-[13px] font-medium placeholder:text-[#6F7F7D] placeholder:font-normal truncate"
              />
              {sourceQuery && sourceQuery !== 'Your location' && (
                <button
                  type="button"
                  onClick={handleClearSource}
                  aria-label="Clear starting point"
                  className="p-1 text-[#6F7F7D] hover:text-[#083335] rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subtle Divider */}
            <div className="h-px bg-[#E2E8E7] ml-4 mr-1" />

            {/* Row 2: Destination (Where to?) */}
            <div className="flex items-center gap-2 h-[34px] min-w-0 px-1">
              <span className={clsx('w-2 h-2 rounded-full shrink-0', destQuery ? 'bg-[#083335]' : 'bg-[#6F7F7D]')} />
              <input
                type="text"
                aria-label="Destination"
                value={destQuery}
                onFocus={() => setActiveField('destination')}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  if (destination) {
                    setDestination(null);
                    setRouteCoordinates(null);
                    clearRoute();
                  }
                }}
                placeholder="Where to?"
                className="w-full bg-transparent border-none focus:outline-none text-[#083335] text-[13px] font-semibold placeholder:text-[#6F7F7D] placeholder:font-normal truncate"
              />
              {destQuery && (
                <button
                  type="button"
                  onClick={handleClearDest}
                  aria-label="Clear destination"
                  className="p-1 text-[#6F7F7D] hover:text-[#083335] rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Swap Button (Compact, aligned to the right) */}
          <div className="shrink-0 pl-1">
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap source and destination"
              title="Swap"
              className="w-7.5 h-7.5 rounded-full bg-[#F5F8F7] hover:bg-[#EAF0F0] active:bg-[#DFE7E6] text-[#083335] border border-[#E2E8E7] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Search / Place Suggestions Dropdown */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-nav-floating border border-[#E2E8E7] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[340px] overflow-y-auto divide-y divide-[#E2E8E7]">
          {/* Option: Current Location */}
          {activeField === 'source' && (
            <button
              type="button"
              onClick={handleSelectCurrentLocation}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#F5F8F7] transition-colors text-left cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800">
                <Navigation className="w-3.5 h-3.5 rotate-45" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[#083335] text-xs sm:text-sm">Your location</div>
                <div className="text-[11px] text-[#6F7F7D] truncate">
                  {currentPlaceName || 'Use GPS location'}
                </div>
              </div>
            </button>
          )}

          {/* Option: Choose on Map */}
          <button
            type="button"
            onClick={() => handlePickOnMap(activeField)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#F5F8F7] transition-colors text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full bg-[#F5F8F7] group-hover:bg-[#083335] group-hover:text-white flex items-center justify-center shrink-0 text-[#083335] transition-colors">
              <MapIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[#083335] text-xs sm:text-sm">Choose on map</div>
              <div className="text-[11px] text-[#6F7F7D] truncate">
                Tap map to set {activeField === 'source' ? 'start point' : 'destination'}
              </div>
            </div>
          </button>

          {/* Loading Indicator */}
          {isSearching && (
            <div className="py-3 flex items-center justify-center gap-2 text-xs text-[#6F7F7D]">
              <Loader2 className="w-4 h-4 animate-spin text-[#083335]" />
              <span>Searching locations...</span>
            </div>
          )}

          {/* Search Results */}
          {!isSearching && results.length > 0 && (
            <div className="py-1">
              <div className="px-3.5 py-1 text-[10px] font-bold text-[#6F7F7D] uppercase tracking-wider">
                Results
              </div>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#F5F8F7] transition-colors text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5F8F7] group-hover:bg-[#083335] group-hover:text-white flex items-center justify-center shrink-0 text-[#083335] transition-colors">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#083335] text-xs sm:text-sm truncate">
                      {r.name}
                    </div>
                    <div className="text-[11px] text-[#6F7F7D] truncate mt-0.5">
                      {r.place_formatted}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Saved Places */}
          {!isSearching && results.length === 0 && savedItems.length > 0 && (
            <div className="py-1">
              <div className="px-3.5 py-1 text-[10px] font-bold text-[#6F7F7D] uppercase tracking-wider">
                Saved places
              </div>
              {savedItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSavedPlace(item)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#F5F8F7] transition-colors text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5F8F7] group-hover:bg-[#083335] group-hover:text-white flex items-center justify-center shrink-0 text-[#083335] transition-colors">
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#083335] text-xs sm:text-sm truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[#6F7F7D] truncate mt-0.5">
                      {item.address || item.summary || 'Saved place'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Close Action */}
          <div className="p-1.5 bg-[#F5F8F7]/70 text-center">
            <button
              type="button"
              onClick={() => setActiveField(null)}
              className="text-xs font-semibold text-[#6F7F7D] hover:text-[#083335] py-0.5 px-3 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

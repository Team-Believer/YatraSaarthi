import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map as MapboxMap } from 'mapbox-gl';
import {
  Search,
  MapPin,
  Loader2,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  LocateFixed,
  Home,
  Briefcase,
  Plane,
  X,
} from 'lucide-react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useRouteStore } from '../stores/useRouteStore';
import { routeService } from '../services/navigation/routeService';
import { savedRouteService, type SavedPlaceItem } from '../services/navigation/savedRouteService';
import { tripMetadataService, type TripMetadata } from '../services/navigation/tripMetadataService';
import { MapContainer, MapController, VehicleMarker } from '../components/map';
import { locationService } from '../services/location/locationService';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const mapRef = useRef<MapboxMap | null>(null);

  // Location & Navigation Stores
  const { latitude: deviceLat, longitude: deviceLon, placeName } = useLocationStore();
  const { setSource, setDestination } = useNavigationStore();
  const travelMode = useRouteStore((s) => s.travelMode);

  // Map state
  const [followVehicle, setFollowVehicle] = useState(true);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Saved items from savedRouteService
  const [savedItems, setSavedItems] = useState<SavedPlaceItem[]>(() =>
    savedRouteService.getSavedItems()
  );

  // Past recorded trips from tripMetadataService
  const [recentTrips] = useState<TripMetadata[]>(() => {
    const all = tripMetadataService.getAll();
    return Object.values(all).slice(0, 4);
  });

  // Start watching location and subscribe to saved places
  useEffect(() => {
    locationService.startWatching();
    return savedRouteService.subscribe((items) => {
      setSavedItems(items);
    });
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const proximity = deviceLat && deviceLon ? `&proximity=${deviceLon},${deviceLat}` : '';
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
        console.error('Home search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, deviceLat, deviceLon]);

  // Navigate to Navigate screen with prefilled destination
  const handleLaunchToDestination = (
    dest: { name: string; coordinates: [number, number] },
    sourceCoords?: [number, number],
    sourceName?: string
  ) => {
    if (sourceCoords && sourceName) {
      setSource({
        name: sourceName,
        coordinates: sourceCoords,
        isCurrentLocation: false,
      });
    } else {
      setSource(null); // Default to 'Your location'
    }

    setDestination(dest);

    // Trigger calculation
    const origin = sourceCoords || (deviceLon && deviceLat ? [deviceLon, deviceLat] : undefined);
    if (origin) {
      routeService.calculateRoutes(dest.coordinates, travelMode, origin);
    }

    navigate('/app/map');
  };

  // Saved shortcuts (inline compact chips, e.g. Home, Work, Airport)
  const savedShortcuts = useMemo(() => {
    return savedItems.filter((item) => item.type === 'place' || !item.originCoordinates).slice(0, 4);
  }, [savedItems]);

  // Render icon for saved place shortcut
  const renderSavedIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('home')) return <Home className="w-3 h-3 text-[#083335]" />;
    if (lower.includes('work') || lower.includes('office')) return <Briefcase className="w-3 h-3 text-[#083335]" />;
    if (lower.includes('airport')) return <Plane className="w-3 h-3 text-[#083335]" />;
    return <MapPin className="w-3 h-3 text-[#083335]" />;
  };

  // Unified recent routes (max 2-3 items for calm spatial display)
  const recentRoutes = useMemo(() => {
    const list: Array<{
      id: string;
      destinationName: string;
      routeLabel?: string;
      destCoords: [number, number];
      sourceCoords?: [number, number];
      sourceName?: string;
      distanceMeters?: number;
      durationSeconds?: number;
    }> = [];

    // 1. From recorded trip history
    for (const trip of recentTrips) {
      if (trip.destinationCoords && trip.destinationName) {
        list.push({
          id: `trip-${trip.sessionId}`,
          destinationName: trip.destinationName,
          routeLabel: trip.sourceName ? `${trip.sourceName} → ${trip.destinationName}` : undefined,
          destCoords: trip.destinationCoords,
          sourceCoords: trip.sourceCoords,
          sourceName: trip.sourceName,
          distanceMeters: trip.distance_meters,
          durationSeconds: trip.duration_seconds,
        });
      }
    }

    // 2. From saved route entries
    for (const saved of savedItems) {
      if (list.length >= 3) break;
      if (saved.type === 'route' || saved.originCoordinates) {
        if (!list.some((l) => l.destCoords[0] === saved.coordinates[0] && l.destCoords[1] === saved.coordinates[1])) {
          list.push({
            id: saved.id,
            destinationName: saved.name,
            routeLabel: saved.address?.includes('→') ? saved.address : undefined,
            destCoords: saved.coordinates,
            sourceCoords: saved.originCoordinates,
            sourceName: saved.address?.includes('→') ? saved.address.split('→')[0].trim() : undefined,
            distanceMeters: saved.distance_meters,
            durationSeconds: saved.duration_seconds,
          });
        }
      }
    }

    return list.slice(0, 2);
  }, [recentTrips, savedItems]);

  const hasCoordinates = deviceLat !== null && deviceLon !== null;

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#F5F8F7] font-body select-none">
      {/* 1. FULL-VIEWPORT MAP CANVAS */}
      <MapContainer
        className="w-full h-full"
        onMapLoaded={(map: MapboxMap) => {
          mapRef.current = map;
        }}
      >
        <MapController
          latitude={deviceLat || 23.0225}
          longitude={deviceLon || 72.5714}
          heading={0}
          followVehicle={followVehicle}
          orientationMode="NORTH_UP"
        />
        {hasCoordinates && (
          <VehicleMarker
            latitude={deviceLat!}
            longitude={deviceLon!}
            heading={0}
            mode="STANDBY"
          />
        )}
      </MapContainer>

      {/* 2. TOP FLOATING SEARCH & SHORTCUTS SURFACE */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+68px)] md:top-6 left-3.5 right-3.5 md:left-24 md:right-auto md:w-[420px] z-20 space-y-2 pointer-events-none">
        {/* Contextual Locality Tag */}
        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full border border-[#E2E8E7]/90 shadow-2xs text-xs font-medium text-[#6F7F7D]">
          <MapPin className="w-3.5 h-3.5 text-[#083335] shrink-0" />
          <span className="truncate max-w-[220px]">{placeName || 'Vastral, Ahmedabad'}</span>
        </div>

        {/* Floating Search Bar */}
        <div className="pointer-events-auto relative">
          <div className="bg-white/98 backdrop-blur-md rounded-[16px] border border-[#E2E8E7] shadow-nav-floating px-3.5 py-3 flex items-center gap-3 transition-all duration-150 focus-within:border-[#083335] focus-within:ring-2 focus-within:ring-[#083335]/10">
            <Search className="w-5 h-5 text-[#6F7F7D] shrink-0 stroke-[2.2]" />

            <input
              id="home-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Where to?"
              className="w-full bg-transparent border-none focus:outline-none text-[#083335] text-sm font-medium placeholder:text-[#6F7F7D] placeholder:font-normal truncate"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="p-1 text-[#6F7F7D] hover:text-[#083335] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin text-[#083335] shrink-0" />
            )}
          </div>

          {/* Suggestions Dropdown */}
          {isSearchFocused && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-nav-floating border border-[#E2E8E7] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 max-h-[280px] overflow-y-auto divide-y divide-[#E2E8E7]">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    handleLaunchToDestination({
                      name: r.name,
                      coordinates: r.coordinates,
                    });
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F5F8F7] transition-colors text-left cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#083335] text-sm truncate font-heading">
                      {r.name}
                    </div>
                    <div className="text-xs text-[#6F7F7D] truncate mt-0.5 font-medium">
                      {r.place_formatted}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8CA5A6] group-hover:text-[#083335] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved Shortcuts Row */}
        {savedShortcuts.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {savedShortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleLaunchToDestination(
                    { name: item.name, coordinates: item.coordinates },
                    item.originCoordinates
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#083335] hover:text-[#052426] bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full transition-all cursor-pointer border border-[#E2E8E7]/90 shadow-2xs hover:bg-[#F5F8F7] active:scale-95 shrink-0"
              >
                {renderSavedIcon(item.name)}
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. FLOATING RECENTER CONTROL */}
      <div className="absolute right-3.5 bottom-[calc(185px+env(safe-area-inset-bottom))] md:bottom-8 md:right-8 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setFollowVehicle(true);
            if (mapRef.current && deviceLon && deviceLat) {
              mapRef.current.flyTo({
                center: [deviceLon, deviceLat],
                zoom: 15,
                duration: 800,
              });
            }
          }}
          aria-label="Recenter on current location"
          title="Recenter"
          className="w-11 h-11 rounded-2xl bg-white/98 hover:bg-[#F5F8F7] border border-[#E2E8E7] shadow-nav-floating flex items-center justify-center text-[#083335] transition-all cursor-pointer active:scale-95"
        >
          <LocateFixed className="w-5 h-5 text-[#083335]" />
        </button>
      </div>

      {/* 4. BOTTOM FLOATING RECENT DESTINATIONS SHEET */}
      {recentRoutes.length > 0 && (
        <div className="absolute bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6 left-3.5 right-3.5 md:left-24 md:right-auto md:w-[420px] z-20">
          <div className="bg-white/96 backdrop-blur-md rounded-2xl border border-[#E2E8E7] shadow-nav-floating p-3 sm:p-3.5 space-y-1.5">
            <div className="text-xs font-semibold text-[#6F7F7D] tracking-wider uppercase px-1 font-heading">
              Recent
            </div>

            <div className="divide-y divide-[#E2E8E7]/70">
              {recentRoutes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() =>
                    handleLaunchToDestination(
                      { name: route.destinationName, coordinates: route.destCoords },
                      route.sourceCoords,
                      route.sourceName
                    )
                  }
                  className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#F5F8F7] px-2 -mx-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#F5F8F7] group-hover:bg-[#EAF0F0] flex items-center justify-center text-[#083335] shrink-0 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#083335]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#083335] truncate font-heading group-hover:text-[#052426]">
                        {route.destinationName}
                      </div>
                      <div className="text-xs text-[#6F7F7D] truncate mt-0.5 font-medium">
                        {route.routeLabel ? `${route.routeLabel} • ` : ''}
                        {route.distanceMeters && `${(route.distanceMeters / 1000).toFixed(1)} km`}
                        {route.durationSeconds && ` • ${Math.round(route.durationSeconds / 60)} min`}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#8CA5A6] group-hover:text-[#083335] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

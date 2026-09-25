import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map as MapboxMap } from 'mapbox-gl';
import {
  Search,
  MapPin,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  LocateFixed,
  Home,
  Briefcase,
  Plane,
  X,
  Navigation2,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useRouteStore } from '../stores/useRouteStore';
import { useSensorStore } from '../stores/useSensorStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getVehicleIcon, getVehicleLabel } from '../utils/navigation/vehicleProfiles';
import { useDemoOutage } from '../hooks/useDemoOutage';
import { deriveGnssNavStatus } from '../utils/navigation/gnssStatus';
import { routeService } from '../services/navigation/routeService';
import { savedRouteService, type SavedPlaceItem } from '../services/navigation/savedRouteService';
import { tripMetadataService, type TripMetadata } from '../services/navigation/tripMetadataService';
import { MapContainer, MapController, VehicleMarker } from '../components/map';
import { locationService } from '../services/location/locationService';
import { getMapboxToken } from '../services/api/envConfig';


interface SearchResult {
  id: string;
  name: string;
  place_formatted: string;
  coordinates: [number, number]; // [lon, lat]
}

export default function Dashboard() {
  const navigate = useNavigate();
  const mapRef = useRef<MapboxMap | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Location & Navigation Stores
  const {
    latitude: deviceLat,
    longitude: deviceLon,
    placeName,
    permission: locationPermission,
    availability: locationAvailability,
  } = useLocationStore();
  const { setSource, setDestination } = useNavigationStore();
  const navState = useNavigationStore((s) => s.state);
  const isLive = useNavigationStore((s) => s.isLive);
  const { capabilities } = useSensorStore();
  const { isSimulating: isDemoOutageActive, outageSeconds: demoOutageSeconds } = useDemoOutage();
  const travelMode = useRouteStore((s) => s.travelMode);
  const vehicleType = useSettingsStore((s) => s.settings.vehicle_type);
  const VehicleIcon = getVehicleIcon(vehicleType);
  const vehicleLabel = getVehicleLabel(vehicleType);


  const hasCoordinates = deviceLat !== null && deviceLon !== null;
  const isGnssAvailable = hasCoordinates || navState.gnss_available;
  const isImuAvailable = Boolean(capabilities.deviceMotion || capabilities.deviceOrientation || navState.imu_available);

  // Real pre-trip & live GNSS navigation status
  const gnssStatus = useMemo(() => {
    return deriveGnssNavStatus({
      isLive,
      navigationMode: navState.navigation_mode,
      gnssAvailable: isGnssAvailable,
      gnssQuality: isGnssAvailable ? 'GOOD' : navState.gnss_quality,
      gnssOutageDuration: navState.gnss_outage_duration,
      environmentState: navState.environment_state,
      imuAvailable: isImuAvailable,
      isDemoOutageActive,
      demoOutageSeconds,
      permission: locationPermission,
      availability: locationAvailability,
    });
  }, [
    isLive,
    navState.navigation_mode,
    isGnssAvailable,
    navState.gnss_quality,
    navState.gnss_outage_duration,
    navState.environment_state,
    isImuAvailable,
    isDemoOutageActive,
    demoOutageSeconds,
    locationPermission,
    locationAvailability,
  ]);

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
        const token = getMapboxToken();
        if (!token) return;
        const proximity = deviceLat && deviceLon ? `&proximity=${deviceLon},${deviceLat}` : '';
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
            trimmed
          )}&access_token=${token}&autocomplete=true&limit=5${proximity}`
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
  const handleLaunchToDestination = useCallback((
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
  }, [setSource, setDestination, deviceLon, deviceLat, travelMode, navigate]);

  // Close search results on outside click
  const handleCloseSearch = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  // Saved shortcuts (inline compact chips, e.g. Home, Work, Airport)
  const savedShortcuts = useMemo(() => {
    return savedItems.filter((item) => item.type === 'place' || !item.originCoordinates).slice(0, 4);
  }, [savedItems]);

  // Render icon for saved place shortcut
  const renderSavedIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('home')) return <Home className="w-3.5 h-3.5" />;
    if (lower.includes('work') || lower.includes('office')) return <Briefcase className="w-3.5 h-3.5" />;
    if (lower.includes('airport')) return <Plane className="w-3.5 h-3.5" />;
    return <MapPin className="w-3.5 h-3.5" />;
  };

  // Unified recent routes (max 2 items for calm spatial display)
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

  // Format distance
  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#F5F8F7] font-body select-none">
      {/* ================================================================= */}
      {/* 1. FULL-VIEWPORT MAP CANVAS (Hero Surface)                        */}
      {/* ================================================================= */}
      <MapContainer
        className="w-full h-full"
        onMapLoaded={(map: MapboxMap) => {
          mapRef.current = map;
        }}
      >
        <MapController
          latitude={deviceLat}
          longitude={deviceLon}
          heading={0}
          followVehicle={followVehicle && hasCoordinates}
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

      {/* Click-away overlay to dismiss search results */}
      {isSearchFocused && results.length > 0 && (
        <div
          className="absolute inset-0 z-15"
          onClick={handleCloseSearch}
        />
      )}

      {/* ================================================================= */}
      {/* 2. TOP FLOATING CONTROLS — Location, Search, Quick Destinations   */}
      {/* ================================================================= */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+66px)] md:top-5 left-3 right-3 md:left-[100px] md:right-auto md:w-[400px] z-20 pointer-events-none">
        <div className="space-y-2.5">

          {/* ─── Location & Navigation Status Context ─── */}
          <div
            className={clsx(
              'pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border shadow-[0_2px_12px_rgba(8,51,53,0.06)] flex items-center justify-between gap-3 min-h-[42px] transition-all',
              gnssStatus.isDr
                ? 'border-amber-400/60 ring-2 ring-amber-400/20'
                : 'border-[#E2E8E7]'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {gnssStatus.isDr ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full shrink-0 transition-colors',
                    gnssStatus.dotColor,
                    (gnssStatus.isDr || gnssStatus.isReacquiring) && 'animate-pulse'
                  )}
                />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[12.5px] font-semibold text-[#083335] truncate font-heading leading-tight">
                  {placeName || (hasCoordinates ? 'Current Location' : 'Locating…')}
                </span>
                <span className="text-[10.5px] font-medium text-[#6F7F7D] truncate leading-tight mt-0.5">
                  {gnssStatus.subtitle}
                </span>
              </div>
            </div>

            {/* Vehicle Profile & Compact GNSS Status Chips */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/app/settings')}
                title={`Selected Vehicle: ${vehicleLabel} (Click to change in Settings)`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-[#083335] transition-colors cursor-pointer"
              >
                <VehicleIcon className="w-3.5 h-3.5 text-[#083335]" />
                <span>{vehicleLabel}</span>
              </button>

              <div
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body border shrink-0',
                  gnssStatus.badgeBg,
                  gnssStatus.badgeBorder,
                  gnssStatus.textColor
                )}
              >
                <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', gnssStatus.dotColor)} />
                <span>{gnssStatus.title}</span>
              </div>
            </div>
          </div>


          {/* ─── Primary Search Bar ─── */}
          <div className="pointer-events-auto relative">
            <div
              className={clsx(
                'bg-white rounded-2xl border shadow-[0_4px_20px_rgba(8,51,53,0.08)] px-4 flex items-center gap-3 transition-all duration-200',
                isSearchFocused
                  ? 'border-[#083335]/30 ring-[3px] ring-[#083335]/8 h-[54px]'
                  : 'border-[#E2E8E7] h-[52px]'
              )}
            >
              <Search className="w-[18px] h-[18px] text-[#8CA5A6] shrink-0 stroke-[2.2]" />

              <input
                ref={searchInputRef}
                id="home-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Where to?"
                autoComplete="off"
                className="w-full bg-transparent border-none focus:outline-none text-[#083335] text-[15px] font-medium placeholder:text-[#8CA5A6] placeholder:font-normal truncate font-heading"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                  }}
                  className="p-1.5 text-[#8CA5A6] hover:text-[#083335] hover:bg-[#F0F4F4] rounded-lg transition-colors cursor-pointer"
                  aria-label="Clear search"
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
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-[0_8px_32px_rgba(8,51,53,0.12)] border border-[#E2E8E7] overflow-hidden z-50 max-h-[260px] overflow-y-auto">
                {results.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      setQuery('');
                      setResults([]);
                      handleLaunchToDestination({
                        name: r.name,
                        coordinates: r.coordinates,
                      });
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F8F7] transition-colors text-left cursor-pointer group',
                      idx > 0 && 'border-t border-[#F0F2F2]'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#F0F4F4] group-hover:bg-[#E2EBEB] flex items-center justify-center shrink-0 transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-[#083335]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#083335] text-[13.5px] truncate font-heading">
                        {r.name}
                      </div>
                      <div className="text-[11.5px] text-[#6F7F7D] truncate mt-px">
                        {r.place_formatted}
                      </div>
                    </div>
                    <Navigation2 className="w-3.5 h-3.5 text-[#8CA5A6] group-hover:text-[#083335] rotate-45 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Quick Destination Shortcuts ─── */}
          {savedShortcuts.length > 0 && (
            <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#083335] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl transition-all cursor-pointer border border-[#E2E8E7]/80 shadow-[0_2px_8px_rgba(8,51,53,0.06)] hover:shadow-[0_2px_12px_rgba(8,51,53,0.1)] hover:border-[#083335]/20 active:scale-[0.97] shrink-0"
                >
                  {renderSavedIcon(item.name)}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. FLOATING RECENTER BUTTON                                       */}
      {/* ================================================================= */}
      <div className={clsx(
        'absolute right-3 z-20 flex flex-col gap-2',
        recentRoutes.length > 0
          ? 'bottom-[calc(160px+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(84px+env(safe-area-inset-bottom))]',
        'md:bottom-8 md:right-8'
      )}>
        <button
          type="button"
          onClick={() => {
            setFollowVehicle(true);
            if (mapRef.current && deviceLon && deviceLat) {
              mapRef.current.flyTo({
                center: [deviceLon, deviceLat],
                zoom: 15.5,
                duration: 800,
              });
            }
          }}
          aria-label="Recenter on current location"
          title="Recenter"
          className="w-11 h-11 rounded-[14px] bg-white hover:bg-[#F5F8F7] border border-[#E2E8E7] shadow-[0_2px_12px_rgba(8,51,53,0.08)] flex items-center justify-center text-[#083335] transition-all cursor-pointer active:scale-95"
        >
          <LocateFixed className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </button>
      </div>

      {/* ================================================================= */}
      {/* 4. BOTTOM RECENT DESTINATIONS SHEET                               */}
      {/* ================================================================= */}
      {recentRoutes.length > 0 && (
        <div className="absolute bottom-[calc(68px+env(safe-area-inset-bottom))] md:bottom-6 left-3 right-3 md:left-[100px] md:right-auto md:w-[400px] z-20">
          <div className="bg-white/[0.97] backdrop-blur-md rounded-2xl border border-[#E2E8E7] shadow-[0_-2px_20px_rgba(8,51,53,0.06)] overflow-hidden">
            {/* Label */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10.5px] font-bold text-[#8CA5A6] tracking-[0.1em] uppercase font-heading select-none">
                Recent
              </span>
            </div>

            {/* Destination List */}
            <div className="px-2 pb-2">
              {recentRoutes.map((route, idx) => (
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
                  className={clsx(
                    'w-full py-2.5 px-2 flex items-center justify-between gap-3 text-left hover:bg-[#F5F8F7] rounded-xl transition-colors cursor-pointer group',
                    idx > 0 && 'border-t border-[#F0F2F2]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-[#F0F4F4] group-hover:bg-[#E2EBEB] flex items-center justify-center shrink-0 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#083335]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-[#083335] truncate font-heading group-hover:text-[#052426]">
                        {route.destinationName}
                      </div>
                      <div className="text-[11.5px] text-[#6F7F7D] truncate mt-px font-medium">
                        {[
                          formatDistance(route.distanceMeters),
                          formatDuration(route.durationSeconds),
                        ].filter(Boolean).join(' · ') || 'Tap to navigate'}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#C0CDCC] group-hover:text-[#083335] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

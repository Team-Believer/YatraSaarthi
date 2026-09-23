import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CarFront,
  Bike,
  Footprints,
  BusFront,
  Navigation,
  Navigation2,
  Search,
  ListFilter,
  ArrowLeft,
  ArrowDown,
  ChevronDown,
  AlertCircle,
  RotateCw,
  X,
  Download,
  Copy,
  Check,
  Clock3,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import {
  historyService,
  type SessionSummary,
  type SessionDetail,
} from '../services/api/historyService';
import { tripMetadataService, type TripMetadata } from '../services/navigation/tripMetadataService';
import { savedRouteService, type SavedPlaceItem } from '../services/navigation/savedRouteService';
import { geocodingService } from '../services/location/geocodingService';
import { resolveTripViewModel, type ResolvedTripViewModel } from '../services/navigation/tripViewModelResolver';
import { TRIP_FIXTURES, getFixtureMetadataMap } from '../services/navigation/tripFixtures';
import { TripRouteMap } from '../components/map/TripRouteMap';
import {
  type DateBucket,
  getISTDateBucket,
  formatTripDateTime,
} from '../utils/timeFormat';

interface GroupedTrips {
  bucket: DateBucket;
  trips: SessionSummary[];
}

function formatDistance(meters: number): string {
  if (!meters || meters <= 0) return '0.0 km';
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

// Vehicle Icon Resolver with pattern matching
function getVehicleIcon(vehicleType?: string) {
  const mode = (vehicleType || '').toLowerCase().trim();
  if (
    mode.includes('bicyc') ||
    mode.includes('bike') ||
    mode.includes('cycl') ||
    mode.includes('motorcycle') ||
    mode.includes('moto') ||
    mode.includes('two_wheeler')
  ) {
    return Bike;
  }
  if (mode.includes('walk') || mode.includes('pedestrian') || mode.includes('foot')) {
    return Footprints;
  }
  if (mode.includes('bus') || mode.includes('transit')) {
    return BusFront;
  }
  return CarFront;
}

function formatVehicleName(vehicleType?: string): string {
  if (!vehicleType) return 'Car';
  const lower = vehicleType.toLowerCase().trim();
  if (lower === 'bicycle' || lower.includes('cycl')) return 'Bicycle';
  if (lower === 'motorcycle' || lower === 'moto' || lower === 'scooter' || lower === 'two_wheeler') return 'Motorcycle';
  if (lower === 'bike') return 'Bicycle';
  if (lower === 'walking' || lower === 'walk' || lower === 'pedestrian') return 'Walking';
  if (lower === 'bus' || lower === 'transit') return 'Bus';
  if (lower === 'car' || lower === 'automobile' || lower === 'driving') return 'Car';
  return vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1).toLowerCase();
}

export default function History() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-persisted trip metadata, saved routes, and geocoded place names
  const [tripMetadataMap, setTripMetadataMap] = useState<Record<string, TripMetadata>>(() => {
    return {
      ...getFixtureMetadataMap(),
      ...tripMetadataService.getAll(),
    };
  });
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItem[]>(() => {
    return savedRouteService.getSavedItems();
  });
  const [geoNamesMap, setGeoNamesMap] = useState<Record<string, string>>({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // UI state
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportJson = () => {
    if (!selectedTrip) return;
    const meta = tripMetadataMap[selectedTrip.session_id];
    const exportData = {
      ...(selectedDetail || selectedTrip),
      trip_metadata: meta || null,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yatrasaarthi_session_${selectedTrip.session_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sync subscriptions for local metadata and saved routes
  useEffect(() => {
    const unsubMeta = tripMetadataService.subscribe((updated) => {
      setTripMetadataMap({
        ...getFixtureMetadataMap(),
        ...updated,
      });
    });
    const unsubSaved = savedRouteService.subscribe((places) => {
      setSavedPlaces(places);
    });
    return () => {
      unsubMeta();
      unsubSaved();
    };
  }, []);

  // Fetch session list (combines backend history records + pre-seeded frontend route fixtures)
  const loadSessions = useCallback(() => {
    setLoading(true);
    setError(null);
    historyService
      .getSessions(50)
      .then((data) => {
        const backendList = data || [];
        // Combine backend sessions with route fixtures seamlessly
        const fixtureSummaries = TRIP_FIXTURES.map((f) => f.summary);
        
        // Prevent duplicate IDs if fixtures already exist in backend
        const existingIds = new Set(backendList.map((s) => s.session_id));
        const uniqueFixtures = fixtureSummaries.filter((f) => !existingIds.has(f.session_id));
        
        const combined = [...backendList, ...uniqueFixtures].sort(
          (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );

        setSessions(combined);
        if (combined.length > 0) {
          setSelectedSessionId((prev) => prev || combined[0].session_id);
        }
        setLoading(false);

        // Collect all distinct coordinates to reverse geocode in background
        const coordsToResolve: Array<{ lat: number; lon: number }> = [];
        for (const item of combined) {
          if (item.start_lat !== null && item.start_lat !== undefined && item.start_lon !== null && item.start_lon !== undefined) {
            coordsToResolve.push({ lat: item.start_lat, lon: item.start_lon });
          }
          if (item.end_lat !== null && item.end_lat !== undefined && item.end_lon !== null && item.end_lon !== undefined) {
            coordsToResolve.push({ lat: item.end_lat, lon: item.end_lon });
          }
        }

        if (coordsToResolve.length > 0) {
          geocodingService.resolveCoordinates(coordsToResolve).then((resolvedMap) => {
            setGeoNamesMap((prev) => ({ ...prev, ...resolvedMap }));
          });
        }
      })
      .catch((err) => {
        console.error('History API error, falling back to local routes:', err);
        const fixtureSummaries = TRIP_FIXTURES.map((f) => f.summary);
        setSessions(fixtureSummaries);
        if (fixtureSummaries.length > 0) {
          setSelectedSessionId((prev) => prev || fixtureSummaries[0].session_id);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Fetch detail for selected session
  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedDetail(null);
      return;
    }

    // Check if selected session is one of the frontend route fixtures
    const fixture = TRIP_FIXTURES.find((f) => f.summary.session_id === selectedSessionId);
    if (fixture) {
      setSelectedDetail({
        ...fixture.summary,
        points: (fixture.metadata.geometry || []).map(([lon, lat]) => ({
          timestamp: fixture.summary.start_time,
          latitude: lat,
          longitude: lon,
          altitude: 0,
          speed: 12,
          heading: 0,
          accuracy: 5,
          confidence: 1,
          mode: 'GPS',
        })),
        navigation_modes_used: ['InEKF'],
      });
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    historyService
      .getSessionDetail(selectedSessionId)
      .then((detail) => {
        setSelectedDetail(detail);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.warn('Non-fatal error loading session detail:', err);
        setSelectedDetail(null);
        setDetailLoading(false);
      });
  }, [selectedSessionId]);

  // Extract distinct vehicle modes from loaded data
  const availableModes = useMemo(() => {
    const modes = new Set<string>();
    for (const s of sessions) {
      if (s.vehicle_type) {
        modes.add(s.vehicle_type);
      }
    }
    return Array.from(modes);
  }, [sessions]);

  // Map of resolved view models per session
  const tripViewModels = useMemo(() => {
    const map = new Map<string, ResolvedTripViewModel>();
    for (const trip of sessions) {
      const meta = tripMetadataMap[trip.session_id];
      const isSelected = trip.session_id === selectedSessionId;
      const detail = isSelected ? selectedDetail : null;
      const vm = resolveTripViewModel(trip, meta, detail, savedPlaces, geoNamesMap);
      map.set(trip.session_id, vm);
    }
    return map;
  }, [sessions, tripMetadataMap, selectedSessionId, selectedDetail, savedPlaces, geoNamesMap]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((trip) => {
      const vm = tripViewModels.get(trip.session_id);
      if (!vm) return true;

      const vehicle = formatVehicleName(vm.vehicleType).toLowerCase();
      const dateFormatted = formatTripDateTime(trip.start_time).fullDate.toLowerCase();

      // 1. Search Query filter (matches source, destination, road, vehicle, date, session_id)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const srcMatch = vm.sourceName.toLowerCase().includes(query);
        const destMatch = vm.destinationName.toLowerCase().includes(query);
        const roadMatch = vm.roadSummary ? vm.roadSummary.toLowerCase().includes(query) : false;
        const vehicleMatch = vehicle.includes(query);
        const dateMatch = dateFormatted.includes(query);
        const idMatch = trip.session_id.toLowerCase().includes(query);

        if (!srcMatch && !destMatch && !roadMatch && !vehicleMatch && !dateMatch && !idMatch) {
          return false;
        }
      }

      // 2. Travel Mode filter
      if (selectedMode !== 'all') {
        const tripMode = vm.vehicleType.toLowerCase();
        if (tripMode !== selectedMode.toLowerCase()) {
          return false;
        }
      }

      // 3. Date Range filter
      if (selectedDateFilter !== 'all') {
        const bucket = getISTDateBucket(trip.start_time);
        if (selectedDateFilter === 'today' && bucket !== 'Today') return false;
        if (selectedDateFilter === 'week' && bucket !== 'Today' && bucket !== 'Yesterday' && bucket !== 'This week') return false;
        if (selectedDateFilter === 'earlier' && bucket !== 'Earlier') return false;
      }

      return true;
    });
  }, [sessions, tripViewModels, searchQuery, selectedMode, selectedDateFilter]);

  // Group filtered sessions by date
  const groupedTrips: GroupedTrips[] = useMemo(() => {
    const groups: Record<DateBucket, SessionSummary[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Earlier: [],
    };

    for (const trip of filteredSessions) {
      const bucket = getISTDateBucket(trip.start_time);
      groups[bucket].push(trip);
    }

    const order: DateBucket[] = ['Today', 'Yesterday', 'This week', 'Earlier'];
    const result: GroupedTrips[] = [];

    for (const bucket of order) {
      if (groups[bucket].length > 0) {
        result.push({
          bucket,
          trips: groups[bucket],
        });
      }
    }

    return result;
  }, [filteredSessions]);

  // Selected trip object and its view model
  const selectedTrip = useMemo(() => {
    return sessions.find((s) => s.session_id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  const selectedViewModel = useMemo(() => {
    if (!selectedTrip) return null;
    return (
      tripViewModels.get(selectedTrip.session_id) ||
      resolveTripViewModel(
        selectedTrip,
        tripMetadataMap[selectedTrip.session_id],
        selectedDetail,
        savedPlaces,
        geoNamesMap
      )
    );
  }, [selectedTrip, tripViewModels, tripMetadataMap, selectedDetail, savedPlaces, geoNamesMap]);

  // Summary Metrics (combined aggregate numbers from all trip records)
  const totalCount = sessions.length;
  const totalDistanceMeters = useMemo(() => {
    let sum = 0;
    for (const trip of sessions) {
      const vm = tripViewModels.get(trip.session_id);
      sum += vm ? vm.distanceMeters : trip.distance_meters || 0;
    }
    return sum;
  }, [sessions, tripViewModels]);

  const totalDurationSeconds = useMemo(() => {
    let sum = 0;
    for (const trip of sessions) {
      const vm = tripViewModels.get(trip.session_id);
      sum += vm ? vm.durationSeconds : trip.duration_seconds || 0;
    }
    return sum;
  }, [sessions, tripViewModels]);

  const totalKmStr = (totalDistanceMeters / 1000).toFixed(1);
  const totalMinStr = Math.round(totalDurationSeconds / 60);

  const handleSelectTrip = (id: string) => {
    setSelectedSessionId(id);
    setShowMobileDetail(true);
  };

  const hasActiveFilter = selectedMode !== 'all' || selectedDateFilter !== 'all';

  return (
    <div className="max-w-[1240px] w-full mx-auto space-y-6 pb-20 md:pb-10 text-ink">
      {/* 1. Page Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border-clean pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Trips
          </h1>
          <p className="text-sm text-[#5E5E5E] font-normal mt-1">
            Your recorded navigation trips and route history
          </p>
        </div>

        {/* Total Summary beside header */}
        <div className="text-[13px] sm:text-[14px] text-[#5E5E5E] font-medium self-start sm:self-auto select-none pt-1">
          {loading ? (
            <span>Loading trips...</span>
          ) : totalCount > 0 ? (
            <span>{totalCount} {totalCount === 1 ? 'trip' : 'trips'} · {totalKmStr} km · {totalMinStr} min</span>
          ) : (
            <span>0 trips</span>
          )}
        </div>
      </div>

      {/* 2. Search + Filter Bar */}
      {!loading && !error && sessions.length > 0 && (
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by source, destination, road, or date..."
              aria-label="Search trips"
              className="w-full pl-10 pr-9 py-2 bg-white border border-border-clean rounded-full text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink/40 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink p-1 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              aria-label="Filter trips"
              className={clsx(
                'h-9 px-3.5 rounded-full border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-2xs select-none',
                hasActiveFilter
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink border-border-clean hover:bg-canvas-soft'
              )}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Filter</span>
              <ChevronDown className="w-3 h-3 text-ink-mute" />
              {hasActiveFilter && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* Filter Popover Dialog */}
            {showFilterMenu && (
              <div className="absolute right-0 top-11 z-30 w-64 p-4 bg-white border border-border-clean rounded-2xl shadow-nav-floating space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-border-clean pb-2">
                  <span className="text-xs font-bold text-ink">Filter trips</span>
                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setSelectedMode('all');
                        setSelectedDateFilter('all');
                      }}
                      className="text-[11px] text-ink-mute hover:text-ink font-medium cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Travel Mode Options */}
                {availableModes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block">
                      Travel mode
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-ink py-0.5">
                        <input
                          type="radio"
                          name="travelMode"
                          checked={selectedMode === 'all'}
                          onChange={() => setSelectedMode('all')}
                          className="accent-[#083335]"
                        />
                        <span>All</span>
                      </label>
                      {availableModes.map((mode) => (
                        <label key={mode} className="flex items-center gap-2 cursor-pointer text-ink py-0.5">
                          <input
                            type="radio"
                            name="travelMode"
                            checked={selectedMode === mode}
                            onChange={() => setSelectedMode(mode)}
                            className="accent-[#083335]"
                          />
                          <span>{formatVehicleName(mode)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Filter Options */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block">
                    Date
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'This week' },
                      { id: 'earlier', label: 'Earlier' },
                    ].map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-ink py-0.5">
                        <input
                          type="radio"
                          name="dateRange"
                          checked={selectedDateFilter === opt.id}
                          onChange={() => setSelectedDateFilter(opt.id)}
                          className="accent-[#083335]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border-clean flex justify-end">
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    className="px-3.5 py-1.5 rounded-full bg-[#083335] text-white text-xs font-medium hover:bg-[#052426] transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Loading Skeleton */}
      {loading && (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-2xl border border-border-clean animate-pulse flex items-center justify-between h-20"
            >
              <div className="space-y-2">
                <div className="w-48 h-4 bg-slate-200 rounded" />
                <div className="w-28 h-3 bg-slate-100 rounded" />
              </div>
              <div className="w-14 h-5 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Error State */}
      {error && !loading && (
        <div className="p-6 bg-white border border-border-clean rounded-2xl text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-ink">Couldn't load trips</h3>
          <p className="text-xs text-ink-body max-w-sm mx-auto">{error}</p>
          <button
            onClick={loadSessions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#083335] text-white text-xs font-medium hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && !error && sessions.length === 0 && (
        <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-border-clean space-y-4 shadow-2xs">
          <div className="w-12 h-12 bg-canvas-soft rounded-2xl flex items-center justify-center mx-auto text-ink-mute">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base sm:text-lg">No trips recorded yet</h3>
            <p className="text-xs sm:text-sm text-ink-body max-w-sm mx-auto mt-1 leading-relaxed">
              Start a navigation trip from the map and it will automatically appear here with full route details.
            </p>
          </div>
          <div>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#083335] text-white text-xs font-medium hover:bg-[#052426] transition-colors shadow-2xs cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Start navigation</span>
            </Link>
          </div>
        </div>
      )}

      {/* 6. No Search Results */}
      {!loading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center border border-border-clean space-y-2 text-ink-mute shadow-2xs">
          <Search className="w-6 h-6 mx-auto text-ink-mute" />
          <p className="text-xs font-medium text-ink">No matching trips found</p>
          <p className="text-[11px] text-[#5E5E5E]">Try adjusting your search terms or filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedMode('all');
              setSelectedDateFilter('all');
            }}
            className="text-xs text-blue-600 font-medium hover:underline pt-2 cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* 7. Main Two-Column Structure (Page-level scrolling) */}
      {!loading && !error && filteredSessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Trip List (approx 42-45%) */}
          <div
            className={clsx(
              'md:col-span-5 space-y-5',
              showMobileDetail ? 'hidden md:block' : 'block'
            )}
          >
            {groupedTrips.map((group) => (
              <div key={group.bucket} className="space-y-2">
                {/* Subtle Date Group Header */}
                <div className="text-[13px] font-semibold text-[#5E5E5E] tracking-tight px-1 select-none">
                  {group.bucket}
                </div>

                {/* Rich Trip Cards with Actual Source → Destination & Metrics */}
                <div className="space-y-2">
                  {group.trips.map((trip) => {
                    const isSelected = selectedSessionId === trip.session_id;
                    const vm = tripViewModels.get(trip.session_id);
                    if (!vm) return null;

                    const VehicleIcon = getVehicleIcon(vm.vehicleType);
                    const vehicleLabel = formatVehicleName(vm.vehicleType);
                    const dateTime = formatTripDateTime(trip.start_time);

                    return (
                      <div
                        key={trip.session_id}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        aria-label={`${vm.sourceName} to ${vm.destinationName}`}
                        onClick={() => handleSelectTrip(trip.session_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTrip(trip.session_id);
                          }
                        }}
                        className={clsx(
                          'p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-left flex items-center justify-between gap-3 min-h-[76px]',
                          isSelected
                            ? 'bg-[#EAF0F0] border-[#083335]/30 text-ink shadow-2xs'
                            : 'bg-white border-border-clean hover:border-[#083335]/20 text-ink hover:bg-[#F7F9F9]'
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Primary Route Title: Source → Destination */}
                          <div className="flex items-center gap-1.5 font-bold text-sm text-ink truncate leading-tight">
                            <span className="truncate">{vm.sourceName}</span>
                            <span className="text-[#8E8E8E] shrink-0 font-normal">→</span>
                            <span className="truncate">{vm.destinationName}</span>
                          </div>

                          {/* Subtitle: Date & Time */}
                          <div className="text-xs text-[#5E5E5E] flex items-center gap-1.5 font-normal">
                            <Clock3 className="w-3 h-3 text-[#8E8E8E] shrink-0" />
                            <span>{dateTime.relativeDate} · {dateTime.timeStr || dateTime.fullDate}</span>
                          </div>

                          {/* Metrics Line: Distance · Duration · Mode */}
                          <div className="text-xs font-medium text-[#5E5E5E] flex items-center gap-1.5 pt-0.5">
                            <span>{formatDistance(vm.distanceMeters)}</span>
                            <span>·</span>
                            <span>{formatDuration(vm.durationSeconds)}</span>
                            <span>·</span>
                            <span>{vehicleLabel}</span>
                          </div>
                        </div>

                        {/* Travel Mode Badge */}
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-canvas-soft border border-border-clean text-ink shadow-2xs">
                          <VehicleIcon className="w-4 h-4 text-[#5E5E5E]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN: Trip Details Panel (approx 55-58%) */}
          <div
            className={clsx(
              'md:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5E5] shadow-2xs space-y-4',
              showMobileDetail ? 'block' : 'hidden md:block'
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <button
                onClick={() => setShowMobileDetail(false)}
                aria-label="Back to trips list"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink px-3 py-1.5 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span className="text-xs font-medium text-[#5E5E5E]">Trip details</span>
            </div>

            {selectedTrip && selectedViewModel ? (
              <div className="space-y-4">
                {/* 1. Header with Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-[22px] font-bold text-ink tracking-tight leading-snug truncate">
                      {selectedViewModel.sourceName} → {selectedViewModel.destinationName}
                    </h2>
                    <p className="text-xs text-[#5E5E5E] mt-0.5 flex items-center gap-1.5">
                      <Clock3 className="w-3 h-3 text-[#8E8E8E]" />
                      <span>{formatTripDateTime(selectedTrip.start_time).fullDate}</span>
                    </p>
                  </div>

                  <span className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                </div>

                {/* 2. Structured Source ↓ Destination Routing Block */}
                <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl p-3.5 space-y-2.5 select-none">
                  {/* Source item */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 border border-white text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs">
                      A
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                        Source
                      </span>
                      <p className="text-sm font-semibold text-ink truncate">
                        {selectedViewModel.sourceName}
                      </p>
                    </div>
                  </div>

                  {/* Flow connector down arrow */}
                  <div className="pl-2 flex items-center gap-2 text-ink-mute">
                    <div className="w-0.5 h-3 bg-slate-300 rounded-full ml-[7px]" />
                    <ArrowDown className="w-3 h-3 text-[#8E8E8E] -ml-[14px]" />
                  </div>

                  {/* Destination item */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#083335] border border-white text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs">
                      B
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[#8E8E8E] uppercase tracking-wider block">
                        Destination
                      </span>
                      <p className="text-sm font-semibold text-ink truncate">
                        {selectedViewModel.destinationName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Trip Key Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl border border-border-clean bg-white space-y-0.5">
                    <span className="text-[11px] font-medium text-[#5E5E5E] block">Distance</span>
                    <span className="text-sm font-bold text-ink block">
                      {formatDistance(selectedViewModel.distanceMeters)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border-clean bg-white space-y-0.5">
                    <span className="text-[11px] font-medium text-[#5E5E5E] block">Duration</span>
                    <span className="text-sm font-bold text-ink block">
                      {formatDuration(selectedViewModel.durationSeconds)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border-clean bg-white space-y-0.5">
                    <span className="text-[11px] font-medium text-[#5E5E5E] block">Travel mode</span>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      {(() => {
                        const Icon = getVehicleIcon(selectedViewModel.vehicleType);
                        return <Icon className="w-3.5 h-3.5 text-[#5E5E5E]" />;
                      })()}
                      <span>{formatVehicleName(selectedViewModel.vehicleType)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border-clean bg-white space-y-0.5">
                    <span className="text-[11px] font-medium text-[#5E5E5E] block">Route</span>
                    <span
                      className="text-xs font-semibold text-ink truncate block"
                      title={selectedViewModel.roadSummary || selectedViewModel.destinationName}
                    >
                      {selectedViewModel.roadSummary || selectedViewModel.destinationName}
                    </span>
                  </div>
                </div>

                {/* 4. Actual Recorded Route Map */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#5E5E5E]">
                      Recorded Route Map
                    </span>
                    {detailLoading && (
                      <span className="text-[11px] text-[#5E5E5E]">
                        Loading route telemetry...
                      </span>
                    )}
                  </div>

                  <TripRouteMap
                    points={selectedDetail?.points}
                    geometry={selectedViewModel.geometry}
                    startLat={selectedViewModel.startLat}
                    startLon={selectedViewModel.startLon}
                    endLat={selectedViewModel.endLat}
                    endLon={selectedViewModel.endLon}
                    className="w-full h-60 sm:h-64"
                  />
                </div>

                {/* 5. Trip Data & Telemetry Export */}
                <div className="pt-2 border-t border-[#E5E5E5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#5E5E5E] uppercase tracking-wider">
                      Trip Data & Export
                    </span>
                    <span className="text-[11px] text-[#5E5E5E] font-medium">
                      {selectedDetail?.points && selectedDetail.points.length > 0
                        ? `${selectedDetail.points.length} samples logged`
                        : selectedViewModel.geometry
                        ? `${selectedViewModel.geometry.length} route coordinates`
                        : 'Session recorded'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#5E5E5E] shrink-0 font-medium">Session ID:</span>
                      <span className="font-mono font-medium text-ink truncate text-[11px]">
                        {selectedTrip.session_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyId(selectedTrip.session_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E5E5] hover:bg-canvas-soft text-ink font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy Session ID"
                      >
                        {copiedId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#5E5E5E]" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="px-3 py-1.5 rounded-lg bg-[#083335] hover:bg-[#052426] text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Download session trajectory JSON"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export JSON</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[#5E5E5E] space-y-2">
                <Navigation2 className="w-8 h-8 mx-auto text-ink-mute" />
                <p className="text-xs font-medium text-ink">Select a trip</p>
                <p className="text-[11px] text-[#5E5E5E]">Choose a trip from the list to view its route and details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

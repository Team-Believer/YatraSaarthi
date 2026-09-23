import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CarFront,
  Bike,
  Footprints,
  BusFront,
  Navigation,
  Search,
  Filter,
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  RotateCw,
  Gauge,
  Compass,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import {
  historyService,
  type SessionSummary,
  type SessionDetail,
} from '../services/api/historyService';
import { TripRouteMap } from '../components/map/TripRouteMap';

// Date bucket categorization
type DateBucket = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

interface GroupedTrips {
  bucket: DateBucket;
  trips: SessionSummary[];
}

// Helpers for human-readable dates and titles
function getDateBucket(dateStr: string): DateBucket {
  const tripDate = new Date(dateStr);
  if (isNaN(tripDate.getTime())) return 'Earlier';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfThisWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (tripDate >= startOfToday) return 'Today';
  if (tripDate >= startOfYesterday) return 'Yesterday';
  if (tripDate >= startOfThisWeek) return 'This week';
  return 'Earlier';
}

function formatTripDateTime(dateStr: string): { relativeDate: string; timeStr: string; fullDate: string } {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { relativeDate: 'Recorded trip', timeStr: '', fullDate: dateStr };
  }

  const bucket = getDateBucket(dateStr);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const fullDate = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let relativeDate = monthDay;
  if (bucket === 'Today') relativeDate = 'Today';
  else if (bucket === 'Yesterday') relativeDate = 'Yesterday';

  return { relativeDate, timeStr, fullDate };
}

function getHumanReadableTitle(trip: SessionSummary): string {
  const { relativeDate, timeStr } = formatTripDateTime(trip.start_time);
  if (timeStr) {
    return `Trip · ${relativeDate}, ${timeStr}`;
  }
  return `Trip · ${relativeDate}`;
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

function getVehicleIcon(vehicleType?: string) {
  const mode = (vehicleType || '').toLowerCase();
  if (mode.includes('bike') || mode.includes('motorcycle') || mode.includes('two_wheeler')) {
    return Bike;
  }
  if (mode.includes('walk') || mode.includes('pedestrian')) {
    return Footprints;
  }
  if (mode.includes('bus') || mode.includes('transit')) {
    return BusFront;
  }
  return CarFront;
}

function formatVehicleName(vehicleType?: string): string {
  if (!vehicleType) return 'Car';
  const lower = vehicleType.toLowerCase();
  if (lower === 'car' || lower === 'automobile') return 'Car';
  if (lower === 'motorcycle' || lower === 'bike' || lower === 'two_wheeler') return 'Motorcycle';
  if (lower === 'bicycle') return 'Bicycle';
  if (lower === 'walking' || lower === 'walk') return 'Walking';
  if (lower === 'bus') return 'Bus';
  return vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1).toLowerCase();
}

export default function History() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // UI state
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  // Fetch initial session list
  const loadSessions = useCallback(() => {
    setLoading(true);
    setError(null);
    historyService
      .getSessions(50)
      .then((data) => {
        const list = data || [];
        setSessions(list);
        if (list.length > 0) {
          setSelectedSessionId((prev) => prev || list[0].session_id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('History API error:', err);
        setError(err.message || 'Error loading trips');
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

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((trip) => {
      // 1. Search Query filter (matches formatted title, vehicle, date)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const title = getHumanReadableTitle(trip).toLowerCase();
        const vehicle = formatVehicleName(trip.vehicle_type).toLowerCase();
        const dateFormatted = formatTripDateTime(trip.start_time).fullDate.toLowerCase();
        const idMatch = trip.session_id.toLowerCase().includes(query);

        if (!title.includes(query) && !vehicle.includes(query) && !dateFormatted.includes(query) && !idMatch) {
          return false;
        }
      }

      // 2. Travel Mode filter
      if (selectedMode !== 'all') {
        const tripMode = (trip.vehicle_type || '').toLowerCase();
        if (tripMode !== selectedMode.toLowerCase()) {
          return false;
        }
      }

      // 3. Date Range filter
      if (selectedDateFilter !== 'all') {
        const bucket = getDateBucket(trip.start_time);
        if (selectedDateFilter === 'today' && bucket !== 'Today') return false;
        if (selectedDateFilter === 'week' && bucket !== 'Today' && bucket !== 'Yesterday' && bucket !== 'This week') return false;
        if (selectedDateFilter === 'earlier' && bucket !== 'Earlier') return false;
      }

      return true;
    });
  }, [sessions, searchQuery, selectedMode, selectedDateFilter]);

  // Group filtered sessions by date
  const groupedTrips: GroupedTrips[] = useMemo(() => {
    const groups: Record<DateBucket, SessionSummary[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Earlier: [],
    };

    for (const trip of filteredSessions) {
      const bucket = getDateBucket(trip.start_time);
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

  // Selected trip object
  const selectedTrip = useMemo(() => {
    return sessions.find((s) => s.session_id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // Summary Metrics (real aggregate numbers from loaded data)
  const totalCount = sessions.length;
  const totalDistanceMeters = sessions.reduce((acc, s) => acc + (s.distance_meters || 0), 0);
  const totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const totalKmStr = (totalDistanceMeters / 1000).toFixed(1);
  const totalMinStr = Math.round(totalDurationSeconds / 60);

  // Copy session ID handler
  const handleCopySessionId = (id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(() => {
        setCopiedSessionId(true);
        setTimeout(() => setCopiedSessionId(false), 2000);
      });
    }
  };

  const handleSelectTrip = (id: string) => {
    setSelectedSessionId(id);
    setShowMobileDetail(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-200 pb-20 md:pb-8 text-slate-900">
      {/* 1. Page Header (White Mobility Design) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border-clean pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Trips
          </h1>
          <p className="text-xs sm:text-sm text-ink-body font-normal mt-0.5">
            Your recent navigation trips
          </p>
        </div>

        {/* 2. Compact Summary Line */}
        <div className="text-xs font-medium text-ink-mute self-start sm:self-auto select-none">
          {loading ? (
            <span className="text-ink-mute">Loading trips...</span>
          ) : totalCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 bg-canvas-soft px-3 py-1 rounded-full border border-border-clean text-ink text-xs font-medium">
              <span>{totalCount} {totalCount === 1 ? 'trip' : 'trips'}</span>
              <span>·</span>
              <span>{totalKmStr} km</span>
              <span>·</span>
              <span>{totalMinStr} min</span>
            </span>
          ) : (
            <span>0 trips</span>
          )}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      {!loading && !error && sessions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trips by date or vehicle..."
              aria-label="Search trips"
              className="w-full pl-10 pr-4 py-2 bg-white border border-border-clean rounded-full text-xs sm:text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-ink/40 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-mute hover:text-ink px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Trigger / Controls */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              aria-label="Filter trips"
              className={clsx(
                'h-9 px-3.5 rounded-full border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-2xs',
                selectedMode !== 'all' || selectedDateFilter !== 'all'
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink border-border-clean hover:bg-canvas-soft'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {(selectedMode !== 'all' || selectedDateFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>

            {/* Mode Pills (Visible on larger screens if modes exist) */}
            {availableModes.length > 1 && (
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedMode('all')}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border',
                    selectedMode === 'all'
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink-body border-border-clean hover:text-ink'
                  )}
                >
                  All
                </button>
                {availableModes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5',
                      selectedMode === mode
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink-body border-border-clean hover:text-ink'
                    )}
                  >
                    <span>{formatVehicleName(mode)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Filter Dropdown Menu */}
            {showFilterMenu && (
              <div className="absolute right-0 top-11 z-30 w-64 p-3 bg-white border border-border-clean rounded-2xl shadow-nav-floating space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div>
                  <label className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block mb-1.5">
                    Date Range
                  </label>
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-canvas-soft border border-border-clean rounded-xl text-ink focus:outline-none"
                  >
                    <option value="all">All dates</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="earlier">Earlier</option>
                  </select>
                </div>

                {availableModes.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block mb-1.5">
                      Travel Mode
                    </label>
                    <select
                      value={selectedMode}
                      onChange={(e) => setSelectedMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-canvas-soft border border-border-clean rounded-xl text-ink focus:outline-none"
                    >
                      <option value="all">All modes</option>
                      {availableModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {formatVehicleName(mode)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border-clean text-[11px]">
                  <button
                    onClick={() => {
                      setSelectedMode('all');
                      setSelectedDateFilter('all');
                    }}
                    className="text-ink-mute hover:text-ink font-medium"
                  >
                    Reset filters
                  </button>
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    className="px-2.5 py-1 rounded-lg bg-ink text-white font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Loading State */}
      {loading && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-2xl border border-border-clean animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="w-44 h-4 bg-slate-200 rounded" />
                <div className="w-32 h-3 bg-slate-100 rounded" />
              </div>
              <div className="w-16 h-6 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* 5. Error State */}
      {error && !loading && (
        <div className="p-6 bg-white border border-border-clean rounded-2xl text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-ink">Couldn't load trips</h3>
          <p className="text-xs text-ink-body max-w-sm mx-auto">{error}</p>
          <button
            onClick={loadSessions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && !error && sessions.length === 0 && (
        <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-border-clean space-y-4 shadow-2xs">
          <div className="w-12 h-12 bg-canvas-soft rounded-2xl flex items-center justify-center mx-auto text-ink-mute">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base sm:text-lg">No trips yet</h3>
            <p className="text-xs sm:text-sm text-ink-body max-w-sm mx-auto mt-1 leading-relaxed">
              Start a navigation trip and it will appear here.
            </p>
          </div>
          <div>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Start navigation</span>
            </Link>
          </div>
        </div>
      )}

      {/* 7. No Search Results State */}
      {!loading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center border border-border-clean space-y-2 text-ink-mute shadow-2xs">
          <Search className="w-6 h-6 mx-auto text-ink-mute" />
          <p className="text-xs font-medium text-ink">No matching trips found</p>
          <p className="text-[11px] text-ink-body">Try adjusting your search terms or filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedMode('all');
              setSelectedDateFilter('all');
            }}
            className="text-xs text-blue-600 font-medium hover:underline pt-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* 8. Main Two-Column Layout (Desktop: List + Detail, Mobile: Toggled views) */}
      {!loading && !error && filteredSessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Grouped Trip List */}
          <div
            className={clsx(
              'md:col-span-5 space-y-5',
              showMobileDetail ? 'hidden md:block' : 'block'
            )}
          >
            {groupedTrips.map((group) => (
              <div key={group.bucket} className="space-y-2">
                {/* Date Group Header */}
                <div className="text-[12px] font-semibold text-ink-mute tracking-tight px-1 select-none">
                  {group.bucket}
                </div>

                {/* Trip Cards */}
                <div className="space-y-2">
                  {group.trips.map((trip) => {
                    const isSelected = selectedSessionId === trip.session_id;
                    const VehicleIcon = getVehicleIcon(trip.vehicle_type);
                    const vehicleLabel = formatVehicleName(trip.vehicle_type);
                    const { relativeDate, timeStr } = formatTripDateTime(trip.start_time);
                    const title = getHumanReadableTitle(trip);

                    return (
                      <div
                        key={trip.session_id}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        aria-label={`Trip on ${relativeDate} at ${timeStr}`}
                        onClick={() => handleSelectTrip(trip.session_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTrip(trip.session_id);
                          }
                        }}
                        className={clsx(
                          'p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none text-left flex items-center justify-between gap-3 min-h-[64px]',
                          isSelected
                            ? 'bg-canvas-soft border-slate-400 text-ink shadow-2xs'
                            : 'bg-white border-border-clean hover:border-slate-300 text-ink hover:bg-canvas-softer'
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Primary Title */}
                          <div className="font-semibold text-xs sm:text-sm text-ink truncate leading-snug">
                            {title}
                          </div>

                          {/* Secondary: Distance · Duration */}
                          <div className="text-[11px] sm:text-xs font-medium text-ink-body flex items-center gap-1.5">
                            <span>{formatDistance(trip.distance_meters)}</span>
                            <span>·</span>
                            <span>{formatDuration(trip.duration_seconds)}</span>
                          </div>

                          {/* Metadata: Date/time · Travel mode */}
                          <div className="text-[11px] text-ink-mute flex items-center gap-1.5 pt-0.5">
                            <span>{relativeDate}</span>
                            {timeStr && (
                              <>
                                <span>·</span>
                                <span>{timeStr}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Travel Mode Badge with Icon */}
                        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-canvas-soft border border-border-clean text-ink text-[11px] font-medium shadow-2xs">
                          <VehicleIcon className="w-3.5 h-3.5 text-ink-body" />
                          <span>{vehicleLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN: Selected Trip Details Panel */}
          <div
            className={clsx(
              'md:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-5',
              showMobileDetail ? 'block' : 'hidden md:block'
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden flex items-center justify-between pb-3 border-b border-border-clean">
              <button
                onClick={() => setShowMobileDetail(false)}
                aria-label="Back to trips"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink px-2.5 py-1.5 rounded-full bg-canvas-soft border border-border-clean"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to trips</span>
              </button>
              <span className="text-xs font-medium text-ink-mute">Trip details</span>
            </div>

            {selectedTrip ? (
              <div className="space-y-5">
                {/* Header Information */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider">
                      Trip details
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-ink mt-1 tracking-tight">
                    {getHumanReadableTitle(selectedTrip)}
                  </h2>
                  <p className="text-xs text-ink-body mt-0.5">
                    {formatTripDateTime(selectedTrip.start_time).fullDate}
                  </p>
                </div>

                {/* Key Summary Metrics Strip */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 bg-canvas-soft rounded-xl border border-border-clean">
                    <span className="text-[10px] uppercase font-bold text-ink-mute block">Distance</span>
                    <div className="text-sm sm:text-base font-semibold text-ink mt-0.5">
                      {formatDistance(selectedTrip.distance_meters)}
                    </div>
                  </div>
                  <div className="p-3 bg-canvas-soft rounded-xl border border-border-clean">
                    <span className="text-[10px] uppercase font-bold text-ink-mute block">Duration</span>
                    <div className="text-sm sm:text-base font-semibold text-ink mt-0.5">
                      {formatDuration(selectedTrip.duration_seconds)}
                    </div>
                  </div>
                  <div className="p-3 bg-canvas-soft rounded-xl border border-border-clean">
                    <span className="text-[10px] uppercase font-bold text-ink-mute block">Mode</span>
                    <div className="text-sm sm:text-base font-semibold text-ink mt-0.5 flex items-center justify-center gap-1">
                      {(() => {
                        const Icon = getVehicleIcon(selectedTrip.vehicle_type);
                        return <Icon className="w-3.5 h-3.5 text-ink-body" />;
                      })()}
                      <span>{formatVehicleName(selectedTrip.vehicle_type)}</span>
                    </div>
                  </div>
                </div>

                {/* Real Route Map */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider">
                      Route map
                    </span>
                    {detailLoading && (
                      <span className="text-[10px] text-ink-mute flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        Loading route...
                      </span>
                    )}
                  </div>

                  <TripRouteMap
                    points={selectedDetail?.points}
                    startLat={selectedTrip.start_lat}
                    startLon={selectedTrip.start_lon}
                    endLat={selectedTrip.end_lat}
                    endLon={selectedTrip.end_lon}
                    className="w-full h-56 sm:h-64"
                  />
                </div>

                {/* Optional Real Trip Insights (only shown if real data exists) */}
                {selectedTrip.duration_seconds > 0 && selectedTrip.distance_meters > 0 && (
                  <div className="p-3.5 bg-canvas-soft rounded-2xl border border-border-clean space-y-2">
                    <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block">
                      Trip insights
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-ink-body">
                        <Gauge className="w-4 h-4 text-ink-mute shrink-0" />
                        <span>Average trip speed:</span>
                        <span className="font-semibold text-ink">
                          {((selectedTrip.distance_meters / selectedTrip.duration_seconds) * 3.6).toFixed(1)} km/h
                        </span>
                      </div>

                      {selectedDetail?.navigation_modes_used && selectedDetail.navigation_modes_used.length > 0 && (
                        <div className="flex items-center gap-2 text-ink-body">
                          <Compass className="w-4 h-4 text-ink-mute shrink-0" />
                          <span>Navigation state:</span>
                          <span className="font-semibold text-ink truncate">
                            {selectedDetail.navigation_modes_used.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Secondary Collapsible Technical Details */}
                <div className="border-t border-border-clean pt-3">
                  <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-ink-mute hover:text-ink transition-colors py-1 cursor-pointer select-none"
                  >
                    <span>Technical details</span>
                    {showTechnicalDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-2.5 p-3 bg-canvas-soft rounded-xl border border-border-clean space-y-2 text-xs font-mono">
                      {/* Session ID */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink-mute font-sans text-[11px]">Session ID:</span>
                        <div className="flex items-center gap-1 text-ink">
                          <span className="truncate max-w-[180px] sm:max-w-[260px]">
                            {selectedTrip.session_id}
                          </span>
                          <button
                            onClick={() => handleCopySessionId(selectedTrip.session_id)}
                            title="Copy session ID"
                            aria-label="Copy session ID"
                            className="p-1 hover:bg-white rounded text-ink-mute hover:text-ink transition-colors"
                          >
                            {copiedSessionId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Coordinates */}
                      {selectedTrip.start_lat !== null && selectedTrip.start_lat !== undefined && (
                        <div className="flex items-center justify-between gap-2 border-t border-border-clean pt-1.5">
                          <span className="text-ink-mute font-sans text-[11px]">Start fix:</span>
                          <span className="text-ink">
                            {selectedTrip.start_lat.toFixed(5)}, {selectedTrip.start_lon?.toFixed(5)}
                          </span>
                        </div>
                      )}

                      {selectedTrip.end_lat !== null && selectedTrip.end_lat !== undefined && (
                        <div className="flex items-center justify-between gap-2 border-t border-border-clean pt-1.5">
                          <span className="text-ink-mute font-sans text-[11px]">End fix:</span>
                          <span className="text-ink">
                            {selectedTrip.end_lat.toFixed(5)}, {selectedTrip.end_lon?.toFixed(5)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-ink-mute space-y-2">
                <Navigation className="w-8 h-8 mx-auto text-ink-mute" />
                <p className="text-xs font-medium text-ink">Select a trip</p>
                <p className="text-[11px] text-ink-body">Choose a trip from the list to view its route and details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

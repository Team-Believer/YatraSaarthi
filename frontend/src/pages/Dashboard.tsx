import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useAuthStore } from '../stores/useAuthStore';
import { locationService } from '../services/location/locationService';
import { sessionLifecycle } from '../services/navigation/sessionLifecycle';
import {
  MapContainer,
  MapController,
  VehicleMarker,
  TrajectoryLayer,
  MapControls,
  DestinationSearch,
  RouteLayer,
} from '../components/map';
import { GlobalStatusBadge } from '../components/common/GlobalStatusBadge';
import { ArchitectureOverview } from '../components/dashboard/ArchitectureOverview';
import {
  Play,
  Square,
  Activity,
  Compass,
  Gauge,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';
import type { Map as MapboxMap } from 'mapbox-gl';

export default function Dashboard() {
  const { user } = useAuthStore();
  const mapRef = useRef<MapboxMap | null>(null);
  const [initialCentered, setInitialCentered] = useState(false);

  // Global Location Store (Real device location independent of route/navigation)
  const {
    latitude: deviceLat,
    longitude: deviceLon,
    accuracy: deviceAcc,
    availability: locAvailability,
    permission: locPermission,
    isStale: locIsStale,
  } = useLocationStore();

  // Navigation Store (IDR fused position & lifecycle state)
  const {
    sessionStatus,
    isLive,
    isEnding,
    fusedPosition,
    trajectory,
    journeySummary,
    state,
    setJourneySummary,
    routeCoordinates,
  } = useNavigationStore();

  // Start real browser geolocation watcher
  useEffect(() => {
    locationService.startWatching();
  }, []);

  // Smooth camera centering when real location is first acquired
  useEffect(() => {
    if (!initialCentered && mapRef.current && deviceLat !== null && deviceLon !== null) {
      mapRef.current.flyTo({
        center: [deviceLon, deviceLat],
        zoom: 16,
        duration: 1200,
      });
      setInitialCentered(true);
    }
  }, [deviceLat, deviceLon, initialCentered]);

  const handleStartSession = async () => {
    try {
      await sessionLifecycle.startLiveSession('CAR');
    } catch (err: any) {
      alert(err.message || 'Error starting navigation session');
    }
  };

  const handleEndSession = async () => {
    try {
      await sessionLifecycle.endLiveSession();
    } catch (err: any) {
      console.error('Error stopping navigation session:', err);
    }
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    const targetLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
    const targetLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;
    if (targetLat !== null && targetLon !== null) {
      mapRef.current.flyTo({
        center: [targetLon, targetLat],
        zoom: 16,
        bearing: isLive ? state.heading_deg : 0,
        duration: 800,
      });
    }
  };

  // Active coordinates: fused if live navigation is active, otherwise real device location
  const displayLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const displayLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;
  const hasCoordinates = displayLat !== null && displayLon !== null;

  // Derive human-readable location status
  let locationStatusText = 'Current Location';
  if (isLive) {
    locationStatusText = state.navigation_mode.includes('DEAD_RECKONING')
      ? 'Intelligent Dead Reckoning Active'
      : state.gnss_available
      ? 'Navigation Active'
      : 'GNSS Degraded';
  } else if (locPermission === 'denied') {
    locationStatusText = 'Location permission required';
  } else if (locAvailability === 'getting') {
    locationStatusText = 'Getting your location...';
  } else if (locAvailability === 'unavailable') {
    locationStatusText = 'Location unavailable';
  } else if (locIsStale) {
    locationStatusText = 'Location signal is stale';
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-5 pb-6 select-none">
      {/* Journey Completed Notification Banner */}
      {journeySummary && (
        <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-xs md:text-sm">Journey Completed</h3>
              <p className="text-[11px] md:text-xs text-white/90 mt-0.5">
                {journeySummary.distance_m
                  ? `Distance: ${(journeySummary.distance_m / 1000).toFixed(2)} km`
                  : 'Zero displacement recorded'}{' '}
                •{' '}
                {journeySummary.duration_s
                  ? `Duration: ${Math.round(journeySummary.duration_s)}s`
                  : 'Duration: <1s'}{' '}
                • Saved to history
              </p>
            </div>
          </div>
          <button
            onClick={() => setJourneySummary(null)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Mobile Greeting Header */}
      <div className="md:hidden space-y-2.5">
        <div>
          <p className="text-xs font-medium text-slate-500">{getGreeting()},</p>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {user ? user.full_name : 'Driver'}
          </h1>
        </div>

        {/* Navigation Status Badge */}
        <div className="flex items-center gap-2">
          <GlobalStatusBadge />
          <span className="text-xs text-slate-500">
            {isLive ? 'Navigation Active' : 'All Systems Online'}
          </span>
        </div>
      </div>

      {/* Desktop Header / Command Card */}
      <div className="hidden md:flex bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-[22px] font-bold text-slate-900 tracking-tight">
            Welcome back, {user ? user.full_name : 'Driver'}
          </h1>
          <p className="text-xs md:text-[13px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500" />
            Intelligent Dead Reckoning Navigation • Real Hardware Sensor Streaming
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlobalStatusBadge />

          {isLive ? (
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-4.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              {isEnding ? 'Ending Journey...' : 'End Live'}
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={sessionStatus === 'STARTING'}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-4.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm shadow-brand-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {sessionStatus === 'STARTING' ? 'Starting Live...' : 'Start Live'}
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative z-20">
        <DestinationSearch />
      </div>

      {/* Main Grid: Real-Time Map (70%) & Telemetry Metrics (30%) */}
      <div className="grid lg:grid-cols-12 gap-4 md:gap-5 items-stretch min-h-[360px] md:min-h-[500px]">
        {/* Map Container Column */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[320px] md:h-[500px] overflow-hidden">
          {/* Map Card Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs md:text-sm text-slate-900 tracking-tight">
                {locationStatusText}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              {hasCoordinates ? (
                <span>
                  {displayLat.toFixed(5)}, {displayLon.toFixed(5)}
                </span>
              ) : (
                <span className="text-slate-400 italic">No GPS fix</span>
              )}
            </div>
          </div>

          {/* Map Body */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <MapContainer
              onMapLoaded={(map) => {
                mapRef.current = map;
              }}
              className="w-full h-full"
            >
              {/* Only follow camera during active live session */}
              <MapController
                latitude={displayLat ?? 0}
                longitude={displayLon ?? 0}
                heading={isLive ? state.heading_deg : 0}
                followVehicle={isLive}
              />

              {/* Marker renders only when real coordinates exist */}
              {hasCoordinates && (
                <VehicleMarker
                  latitude={displayLat}
                  longitude={displayLon}
                  heading={isLive ? state.heading_deg : 0}
                  mode={isLive ? state.navigation_mode : 'STANDBY'}
                />
              )}

              {routeCoordinates && <RouteLayer geometry={routeCoordinates} />}

              {/* Live trajectory from real InEKF state */}
              {isLive && trajectory.length > 0 && (
                <TrajectoryLayer fusedTrack={trajectory} />
              )}

              <MapControls onRecenter={handleRecenter} className="absolute bottom-4 right-4 z-10" />
            </MapContainer>

            {/* Empty / Acquiring Location Overlay */}
            {!hasCoordinates && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 text-center">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-2 max-w-xs">
                  <Radio className="w-7 h-7 text-brand-600 animate-pulse mx-auto" />
                  <h4 className="font-bold text-xs md:text-sm text-slate-900">{locationStatusText}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {locPermission === 'denied'
                      ? 'Please allow browser location permissions.'
                      : 'Connecting to GNSS & IMU sensor stream...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Metrics & Status Panel Column */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3 md:gap-3.5">
          {/* Mobile Start/End buttons */}
          <div className="md:hidden">
            {isLive ? (
              <button
                onClick={handleEndSession}
                disabled={isEnding}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Square className="w-4 h-4 fill-white" />
                {isEnding ? 'Ending Journey...' : 'End Live Navigation'}
              </button>
            ) : (
              <button
                onClick={handleStartSession}
                disabled={sessionStatus === 'STARTING'}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm shadow-brand-500/20"
              >
                <Play className="w-4 h-4 fill-white" />
                {sessionStatus === 'STARTING' ? 'Starting...' : 'Start Live Navigation'}
              </button>
            )}
          </div>

          {/* Telemetry Metrics Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 md:gap-3">
            {/* Speed Card */}
            <div className="bg-white rounded-xl p-3.5 md:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-brand-600" /> Speed
                </div>
                <div className="text-2xl md:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
                  {isLive ? (state.speed * 3.6).toFixed(1) : '0.0'}{' '}
                  <span className="text-xs font-semibold text-slate-400 ml-0.5">km/h</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50/80 border border-blue-100/60 flex items-center justify-center text-brand-700 font-bold text-xs">
                {isLive ? (state.speed * 3.6).toFixed(0) : '0'}
              </div>
            </div>

            {/* Heading Card */}
            <div className="bg-white rounded-xl p-3.5 md:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-brand-600" /> Heading
                </div>
                <div className="text-2xl md:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
                  {isLive ? `${state.heading_deg.toFixed(0)}°` : '0°'}{' '}
                  {isLive && (
                    <span className="text-xs font-medium text-slate-400 ml-1">
                      ({(state.heading_confidence * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50/80 border border-blue-100/60 flex items-center justify-center text-brand-600">
                <Compass className="w-4.5 h-4.5" />
              </div>
            </div>

            {/* Accuracy Card */}
            <div className="bg-white rounded-xl p-3.5 md:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-600" /> Accuracy
                </div>
                <div className="text-2xl md:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
                  {isLive
                    ? `± ${state.horizontal_accuracy.toFixed(1)}`
                    : deviceAcc !== null
                    ? `± ${deviceAcc.toFixed(1)}`
                    : '± 0.0'}{' '}
                  <span className="text-xs font-medium text-slate-400 ml-0.5">m</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50/80 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* INEKF IDR STATUS Console Card */}
          <div className="bg-slate-900 rounded-xl p-4 text-white border border-slate-800 shadow-sm flex flex-col justify-between flex-1 min-h-[135px]">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  InEKF IDR Status
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isLive
                      ? state.navigation_mode.includes('DEAD_RECKONING')
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  {isLive ? state.navigation_mode : 'STANDBY'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400 text-[11px]">ZUPT (Zero-Velocity)</span>
                  <span className="font-semibold text-white text-[11px]">
                    {isLive && state.zupt_active ? (
                      <span className="text-emerald-400">ACTIVE</span>
                    ) : (
                      'OFF'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-slate-400 text-[11px]">NHC (Non-Holonomic)</span>
                  <span className="font-semibold text-emerald-400 text-[11px]">
                    {isLive && state.nhc_active ? 'ACTIVE' : 'READY'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Confidence</span>
                  <span className="font-bold text-white text-[11px]">
                    {isLive ? `${(state.position_confidence * 100).toFixed(0)}%` : '100%'}
                  </span>
                </div>
              </div>
            </div>

            {isLive && state.navigation_mode.includes('DEAD_RECKONING') && (
              <div className="mt-2.5 p-2 bg-amber-500/15 rounded-lg border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>GNSS unavailable. Inertial dead reckoning active.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Architecture Overview - hidden on mobile for cleaner view */}
      <div className="hidden md:block">
        <ArchitectureOverview />
      </div>
    </div>
  );
}

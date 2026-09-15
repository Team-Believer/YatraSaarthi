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
  } = useNavigationStore();

  // Start real browser geolocation watcher
  useEffect(() => {
    locationService.startWatching();
    return () => {
      // Keep running across pages for consistent global location
    };
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Journey Completed Notification Banner */}
      {journeySummary && (
        <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Journey Completed</h3>
              <p className="text-xs text-white/90">
                {journeySummary.distance_m
                  ? `Distance: ${(journeySummary.distance_m / 1000).toFixed(2)} km`
                  : 'Zero displacement recorded'}{' '}
                •{' '}
                {journeySummary.duration_s
                  ? `Duration: ${Math.round(journeySummary.duration_s)}s`
                  : 'Duration: <1s'}{' '}
                • Successfully saved to SQLite history
              </p>
            </div>
          </div>
          <button
            onClick={() => setJourneySummary(null)}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Header / Control Bar */}
      <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Welcome back, {user ? user.full_name : 'Driver'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Intelligent Dead Reckoning Navigation • Real Hardware Sensor Streaming
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlobalStatusBadge />

          {isLive ? (
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="bg-status-danger hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <Square className="w-4 h-4 fill-white" />
              {isEnding ? 'Ending Journey...' : 'End Live'}
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={sessionStatus === 'STARTING'}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20"
            >
              <Play className="w-4 h-4 fill-white" />
              {sessionStatus === 'STARTING' ? 'Starting Live Session...' : 'Start Live'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Real-Time Map (2 cols) & Telemetry Metrics (1 col) */}
      <div className="grid lg:grid-cols-3 gap-6 items-stretch min-h-[520px]">
        {/* Map Container */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-3 border border-brand-50 shadow-sm flex flex-col h-[520px] relative">
          <div className="flex justify-between items-center px-4 py-2 mb-2">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-brand-600" />
              <span className="font-bold text-sm text-brand-navy">{locationStatusText}</span>
            </div>
            <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              {hasCoordinates ? (
                <span>
                  {displayLat.toFixed(5)}, {displayLon.toFixed(5)}
                </span>
              ) : (
                <span className="text-gray-400 italic">No fix available</span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full h-full relative rounded-2xl overflow-hidden min-h-[440px]">
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

              {/* Live trajectory from real InEKF state */}
              {isLive && trajectory.length > 0 && (
                <TrajectoryLayer fusedTrack={trajectory} />
              )}

              <MapControls onRecenter={handleRecenter} />
            </MapContainer>

            {/* Empty / Acquiring Location Overlay */}
            {!hasCoordinates && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center pointer-events-none p-6 text-center">
                <div className="bg-white/95 p-6 rounded-3xl border border-brand-100 shadow-xl space-y-2 max-w-sm">
                  <Activity className="w-8 h-8 text-brand-600 animate-pulse mx-auto" />
                  <h4 className="font-bold text-sm text-brand-navy">{locationStatusText}</h4>
                  <p className="text-xs text-gray-500">
                    {locPermission === 'denied'
                      ? 'Please allow browser location permissions in your site settings to enable live positioning.'
                      : 'Connecting to real browser geolocation sensors...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Panel */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Speed Card */}
          <div className="bg-white rounded-3xl p-5 border border-brand-50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-brand-600" /> Vehicle Speed
              </div>
              <div className="text-3xl font-bold text-brand-navy">
                {isLive ? (state.speed * 3.6).toFixed(1) : '0.0'}{' '}
                <span className="text-sm font-medium text-gray-500">km/h</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 font-bold text-sm">
              {isLive ? (state.speed * 3.6).toFixed(0) : '0'}
            </div>
          </div>

          {/* Heading Card */}
          <div className="bg-white rounded-3xl p-5 border border-brand-50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-600" /> Heading Bearing
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {isLive ? `${state.heading_deg.toFixed(0)}°` : 'N/A'}{' '}
                {isLive && (
                  <span className="text-xs font-medium text-gray-500">
                    ({(state.heading_confidence * 100).toFixed(0)}% conf)
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          {/* Accuracy Card */}
          <div className="bg-white rounded-3xl p-5 border border-brand-50 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-brand-600" /> Position Accuracy
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {isLive
                  ? `± ${state.horizontal_accuracy.toFixed(1)}`
                  : deviceAcc !== null
                  ? `± ${deviceAcc.toFixed(1)}`
                  : 'N/A'}{' '}
                <span className="text-xs font-medium text-gray-500">meters</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
              <ShieldCheck className="w-5 h-5 text-status-success" />
            </div>
          </div>

          {/* IDR Navigation Mode Card */}
          <div className="bg-brand-navy rounded-3xl p-5 text-white shadow-xl flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-brand-100 uppercase tracking-wider">
                  InEKF IDR Status
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    isLive
                      ? state.navigation_mode.includes('DEAD_RECKONING')
                        ? 'bg-status-warning/20 text-status-warning border border-status-warning/30'
                        : 'bg-status-success/20 text-status-success border border-status-success/30'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {isLive ? state.navigation_mode : 'STANDBY'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-brand-100">Zero-Velocity (ZUPT)</span>
                  <span className="font-semibold text-white">
                    {isLive && state.zupt_active ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-brand-100">Non-Holonomic (NHC)</span>
                  <span className="font-semibold text-status-success">
                    {isLive && state.nhc_active ? 'ACTIVE' : 'READY'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-100">InEKF Confidence</span>
                  <span className="font-bold text-white">
                    {isLive ? `${(state.position_confidence * 100).toFixed(0)}%` : '100%'}
                  </span>
                </div>
              </div>
            </div>

            {isLive && state.navigation_mode.includes('DEAD_RECKONING') && (
              <div className="mt-4 p-3 bg-status-warning/20 rounded-2xl border border-status-warning/30 text-[11px] text-status-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>GNSS unavailable. Inertial dead reckoning active.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conceptual Explanation & Technical Architecture Section */}
      <ArchitectureOverview />
    </div>
  );
}

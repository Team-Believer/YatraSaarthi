import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
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
import {
  ShieldAlert,
  Play,
  Square,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
  X,
  Activity,
} from 'lucide-react';
import type { Map as MapboxMap } from 'mapbox-gl';

export default function LiveMap() {
  const mapRef = useRef<MapboxMap | null>(null);
  const [initialCentered, setInitialCentered] = useState(false);

  // Global Location Store (Real device position independent of navigation/route)
  const {
    latitude: deviceLat,
    longitude: deviceLon,
    accuracy: deviceAcc,
    availability: locAvailability,
    permission: locPermission,
    isStale: locIsStale,
  } = useLocationStore();

  // Navigation Store (InEKF IDR fusion and session lifecycle)
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

  // Ensure location tracking is active
  useEffect(() => {
    locationService.startWatching();
  }, []);

  // Smooth camera centering when real device position is acquired
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

  // Human-readable status label
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
    <div className="h-[calc(100vh-6rem)] w-full relative flex flex-col rounded-3xl overflow-hidden shadow-sm border border-brand-50 bg-white">
      {/* Journey Completed Notification Modal / Toast */}
      {journeySummary && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <div className="text-xs">
            <span className="font-bold">Journey Completed</span> •{' '}
            {journeySummary.distance_m
              ? `Distance: ${(journeySummary.distance_m / 1000).toFixed(2)} km`
              : 'Zero displacement recorded'}{' '}
            •{' '}
            {journeySummary.duration_s
              ? `Duration: ${Math.round(journeySummary.duration_s)}s`
              : 'Duration: <1s'}
          </div>
          <button
            onClick={() => setJourneySummary(null)}
            className="ml-2 hover:bg-white/20 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAP CANVAS (MAP-FIRST: 80%+ Viewport) */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          onMapLoaded={(map) => {
            mapRef.current = map;
          }}
          className="w-full h-full"
        >
          {/* Follow camera only when actively live navigating */}
          <MapController
            latitude={displayLat ?? 0}
            longitude={displayLon ?? 0}
            heading={isLive ? state.heading_deg : 0}
            followVehicle={isLive}
          />

          {hasCoordinates && (
            <VehicleMarker
              latitude={displayLat}
              longitude={displayLon}
              heading={isLive ? state.heading_deg : 0}
              mode={isLive ? state.navigation_mode : 'STANDBY'}
            />
          )}

          {isLive && trajectory.length > 0 && (
            <TrajectoryLayer fusedTrack={trajectory} />
          )}

          <MapControls onRecenter={handleRecenter} />
        </MapContainer>

        {/* Empty / Acquiring Location Overlay */}
        {!hasCoordinates && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none p-6 text-center">
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

        {/* TOP NAVIGATION INSTRUCTION OVERLAY */}
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto z-10 md:w-96">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-brand-100 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/30">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                {isLive ? 'Active Navigation' : 'Standby Mode'}
              </span>
              <h3 className="font-bold text-brand-navy text-sm truncate">
                {isLive ? 'Following InEKF Fused Trajectory' : 'Ready to Start Session'}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {isLive
                  ? 'Keep moving along nominal path'
                  : 'Click Start Live to stream real 6-DoF telemetry'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT TELEMETRY OVERLAY CARD */}
        <div className="absolute top-4 right-4 z-10 hidden md:block w-72">
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-brand-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-xs font-bold text-brand-navy">Live Telemetry</span>
              <GlobalStatusBadge />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Speed</span>
                <span className="font-bold text-brand-navy">
                  {isLive ? (state.speed * 3.6).toFixed(1) : '0.0'} km/h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Heading</span>
                <span className="font-bold text-brand-navy">
                  {isLive ? `${state.heading_deg.toFixed(0)}°` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Accuracy</span>
                <span className="font-bold text-status-success">
                  {isLive
                    ? `± ${state.horizontal_accuracy.toFixed(1)} m`
                    : deviceAcc !== null
                    ? `± ${deviceAcc.toFixed(1)} m`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">InEKF Conf</span>
                <span className="font-bold text-brand-600">
                  {isLive ? `${(state.position_confidence * 100).toFixed(0)}%` : '100%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span className="font-bold text-status-warning truncate max-w-[120px]">
                  {isLive ? state.navigation_mode : 'STANDBY'}
                </span>
              </div>
            </div>

            {isLive && state.navigation_mode.includes('DEAD_RECKONING') && (
              <div className="p-3 bg-status-warning/10 rounded-2xl border border-status-warning/20 text-[11px] text-status-warning flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>GNSS Degraded. Inertial Dead Reckoning Active.</span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM TRIP CONTROL BAR */}
        <div className="absolute bottom-4 left-4 right-4 md:left-24 md:right-24 z-10">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-brand-100 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-navy">{locationStatusText}</div>
                <div className="text-[11px] font-mono text-gray-500">
                  {hasCoordinates
                    ? `${displayLat.toFixed(5)}, ${displayLon.toFixed(5)}`
                    : 'Coordinates acquiring...'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isLive ? (
                <button
                  onClick={handleEndSession}
                  disabled={isEnding}
                  className="bg-status-danger hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Square className="w-4 h-4 fill-white" />
                  {isEnding ? 'Ending Journey...' : 'End Live Navigation Session'}
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={sessionStatus === 'STARTING'}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {sessionStatus === 'STARTING'
                    ? 'Starting Live Session...'
                    : 'Start Live Navigation Session'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

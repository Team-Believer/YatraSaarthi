import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useSensorStore } from '../stores/useSensorStore';
import { locationService } from '../services/location/locationService';
import { sessionLifecycle } from '../services/navigation/sessionLifecycle';
import { sensorCollector } from '../services/sensors/sensorCollector';
import { useResolvedHeading } from '../hooks/useResolvedHeading';
import {
  MapContainer,
  MapController,
  VehicleMarker,
  TrajectoryLayer,
  RouteLayer,
  MapControls,
} from '../components/map';
import type { MapOrientationMode } from '../components/map/MapController';
import type { Map as MapboxMap } from 'mapbox-gl';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Play,
  Square,
  Cpu,
  Sliders,
  ChevronDown,
  Layers,
  Activity,
  Gauge,
  Compass,
  AlertCircle,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function TunnelMode() {
  const mapRef = useRef<MapboxMap | null>(null);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [orientationMode, setOrientationMode] = useState<MapOrientationMode>('HEADING_UP');
  const [isSimulatingOutage, setIsSimulatingOutage] = useState(false);
  const [simulatedOutageSeconds, setSimulatedOutageSeconds] = useState(0);
  const [showTechnicalPanel, setShowTechnicalPanel] = useState(false);
  const [confirmEndSession, setConfirmEndSession] = useState(false);
  const outageTimerRef = useRef<any>(null);

  // Resolved Heading from single prioritized source
  const { headingDeg, cardinal, valid: isHeadingValid } = useResolvedHeading();
  const activeHeading = isHeadingValid && headingDeg !== null ? headingDeg : 0;

  // Real device location from Geolocation API
  const {
    latitude: deviceLat,
    longitude: deviceLon,
    permission: locPermission,
  } = useLocationStore();

  // Navigation Store Selectors
  const isLive = useNavigationStore((s) => s.isLive);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);
  const trajectory = useNavigationStore((s) => s.trajectory);
  const routeCoordinates = useNavigationStore((s) => s.routeCoordinates);
  const destination = useNavigationStore((s) => s.destination);
  const state = useNavigationStore((s) => s.state);

  const {
    speed,
    horizontal_accuracy: accuracy,
    position_confidence: confidence,
    navigation_mode: navMode,
    gnss_available: gnssAvailable,
    gnss_quality: gnssQuality,
    gnss_outage_duration: backendOutageDuration,
    nhc_active: nhcActive,
    zupt_active: zuptActive,
    imu_available: imuAvailable,
    ai_velocity: aiVelocity,
    ai_uncertainty_sigma: aiUncertainty,
  } = state;

  const { capabilities } = useSensorStore();

  // Start real browser geolocation watcher on mount
  useEffect(() => {
    locationService.startWatching();
    return () => {
      if (sensorCollector.isGnssSuppressed()) {
        sensorCollector.setGnssSuppression(false);
      }
      if (outageTimerRef.current) {
        clearInterval(outageTimerRef.current);
      }
    };
  }, []);

  // Outage Timer logic when simulated outage is active
  useEffect(() => {
    if (isSimulatingOutage && isLive) {
      outageTimerRef.current = setInterval(() => {
        setSimulatedOutageSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (outageTimerRef.current) {
        clearInterval(outageTimerRef.current);
      }
      if (!isSimulatingOutage) {
        setSimulatedOutageSeconds(0);
      }
    }
    return () => {
      if (outageTimerRef.current) clearInterval(outageTimerRef.current);
    };
  }, [isSimulatingOutage, isLive]);

  // Handle manual map panning
  const handleManualInteraction = useCallback(() => {
    setFollowVehicle(false);
  }, []);

  // Re-center on vehicle
  const handleRecenter = useCallback(() => {
    setFollowVehicle(true);
    const targetLon = fusedPosition?.longitude ?? deviceLon;
    const targetLat = fusedPosition?.latitude ?? deviceLat;
    if (mapRef.current && targetLon && targetLat) {
      mapRef.current.easeTo({
        center: [targetLon, targetLat],
        zoom: 16.5,
        bearing: orientationMode === 'HEADING_UP' ? activeHeading : 0,
        pitch: 52,
        offset: [0, 60],
        duration: 800,
      });
    }
  }, [fusedPosition, deviceLon, deviceLat, orientationMode, activeHeading]);

  // Toggle map orientation
  const handleOrientationToggle = useCallback((mode: MapOrientationMode) => {
    setOrientationMode(mode);
    if (mapRef.current) {
      const targetBearing = mode === 'HEADING_UP' ? activeHeading : 0;
      mapRef.current.easeTo({
        bearing: targetBearing,
        duration: 500,
      });
    }
  }, [activeHeading]);

  // Start / End Navigation Session Actions
  const handleStartSession = async () => {
    try {
      await sessionLifecycle.startLiveSession();
      setFollowVehicle(true);
    } catch (err: any) {
      alert(err.message || 'Failed to start test session');
    }
  };

  const handleEndSession = async () => {
    if (!confirmEndSession) {
      setConfirmEndSession(true);
      setTimeout(() => setConfirmEndSession(false), 4000);
      return;
    }
    setConfirmEndSession(false);
    setShowTechnicalPanel(false);
    try {
      if (isSimulatingOutage) {
        sensorCollector.setGnssSuppression(false);
        setIsSimulatingOutage(false);
      }
      await sessionLifecycle.endLiveSession();
    } catch (err: any) {
      console.error('Failed to end test session:', err);
    }
  };

  // Toggle GNSS Outage Simulation
  const handleToggleOutageSimulation = () => {
    if (!isLive) return;
    const nextState = !isSimulatingOutage;
    setIsSimulatingOutage(nextState);
    sensorCollector.setGnssSuppression(nextState);
  };

  // Coordinates resolution
  const displayLat = fusedPosition?.latitude ?? deviceLat;
  const displayLon = fusedPosition?.longitude ?? deviceLon;
  const hasCoordinates = displayLat !== null && displayLon !== null && displayLat !== 0;

  // Determine Outage / Dead Reckoning Status
  const isDRActive =
    isLive &&
    (['DEAD_RECKONING', 'MAP_AIDED_DEAD_RECKONING', 'TUNNEL', 'GNSS_LOST', 'GNSS_DEGRADING'].includes(navMode) ||
      !gnssAvailable ||
      isSimulatingOutage);

  const isDegraded = isLive && (navMode === 'GNSS_DEGRADING' || gnssQuality === 'DEGRADED');
  const isRecovering = isLive && (navMode === 'RECOVERY' || navMode === 'GNSS_RECOVERING' || gnssQuality === 'RECOVERING');
  const isNominalGNSS = isLive && !isDRActive && !isDegraded && !isRecovering && gnssAvailable;

  // Format outage duration
  const displayOutageDuration = isSimulatingOutage
    ? simulatedOutageSeconds
    : backendOutageDuration > 0
    ? backendOutageDuration
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speedKmh = Math.max(0, Math.round((speed || 0) * 3.6));

  // 5 Outage Stages for compact stepper
  const stages = [
    { id: 'gnss', label: 'GNSS Nominal', active: isNominalGNSS },
    { id: 'degrading', label: 'Degrading', active: isDegraded },
    { id: 'outage', label: 'Outage / DR', active: isDRActive },
    { id: 'recovery', label: 'Recovery', active: isRecovering },
    { id: 'restored', label: 'Restored', active: isNominalGNSS && displayOutageDuration === 0 && isLive },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-canvas">
      {/* 1. FULL-VIEWPORT MAP CANVAS */}
      <div className="absolute inset-0 w-full h-full">
        <MapContainer
          onMapLoaded={(map) => {
            mapRef.current = map;
          }}
          initialCenter={[displayLon ?? 72.67, displayLat ?? 23.00]}
          initialZoom={16.5}
          initialPitch={52}
          className="w-full h-full"
        >
          <MapController
            latitude={hasCoordinates ? displayLat : null}
            longitude={hasCoordinates ? displayLon : null}
            heading={activeHeading}
            followVehicle={followVehicle}
            orientationMode={orientationMode}
            is3D={true}
            onManualInteraction={handleManualInteraction}
          />

          {/* Vehicle Marker */}
          {hasCoordinates && (
            <VehicleMarker
              latitude={displayLat}
              longitude={displayLon}
              heading={activeHeading}
              mode={isDRActive ? 'DEAD_RECKONING' : isRecovering ? 'RECOVERY' : isLive ? navMode : 'STANDBY'}
            />
          )}

          {/* Planned Route Layer */}
          {routeCoordinates && (
            <RouteLayer
              geometry={routeCoordinates}
              destinationName={destination?.name}
            />
          )}

          {/* Continuous InEKF Fused Trajectory */}
          {isLive && trajectory.length > 0 && (
            <TrajectoryLayer fusedTrack={trajectory} />
          )}

          {/* Map Floating Controls */}
          <MapControls
            onRecenter={handleRecenter}
            onOrientationToggle={handleOrientationToggle}
            orientationMode={orientationMode}
            followVehicle={followVehicle}
            heading={activeHeading}
          />
        </MapContainer>
      </div>

      {/* 2. TOP FLOATING NAVIGATION HEADER */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-3 right-3 sm:left-6 sm:right-6 z-30 pointer-events-none">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          {/* Left: Back Link & Title */}
          <div className="flex items-center gap-3 pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-border-clean shadow-nav-floating">
            <Link
              to="/app"
              aria-label="Back to Navigate"
              title="Back to Navigate"
              className="w-9 h-9 rounded-full bg-canvas-soft hover:bg-surface-pressed text-ink flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0 pr-1">
              <h1 className="text-xs sm:text-sm font-bold text-ink leading-tight truncate font-heading">
                GNSS outage test
              </h1>
              <p className="text-[11px] text-ink-mute hidden sm:block leading-none mt-0.5">
                Test navigation continuity during GNSS loss
              </p>
            </div>
          </div>

          {/* Right: Primary Status Pill */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-border-clean shadow-nav-floating text-xs font-medium',
                isDRActive && 'border-amber-300 ring-2 ring-amber-400/20'
              )}
            >
              <span
                className={clsx(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  !isLive
                    ? 'bg-neutral-400'
                    : isDRActive
                    ? 'bg-amber-500 animate-pulse'
                    : isRecovering
                    ? 'bg-cyan-500 animate-pulse'
                    : isDegraded
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                )}
              />

              <span className="text-ink font-semibold whitespace-nowrap font-body">
                {!isLive
                  ? 'Standby'
                  : isDRActive
                  ? 'Dead reckoning'
                  : isRecovering
                  ? 'GNSS recovering'
                  : isDegraded
                  ? 'GNSS degraded'
                  : 'GNSS signal'}
              </span>

              {/* Compact timer pill during DR */}
              {isDRActive && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-[#083335] text-white tabular-nums">
                  {formatDuration(displayOutageDuration)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOP-LEFT COMPACT MAP LEGEND */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+68px)] left-3 sm:left-6 z-20 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-border-clean shadow-2xs flex items-center gap-2.5 text-[11px] font-medium text-ink font-body">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
            <span>Fused</span>
          </div>
          <div className="h-2.5 w-px bg-border-clean" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100" />
            <span>DR</span>
          </div>
        </div>
      </div>

      {/* 4. FLOATING BOTTOM TEST HUD & COLLAPSIBLE SYSTEM SHEET */}
      <div className="absolute bottom-[calc(68px+env(safe-area-inset-bottom)+10px)] md:bottom-5 left-3 right-3 sm:left-6 sm:right-6 z-30 pointer-events-none">
        <div className="max-w-3xl mx-auto space-y-2.5 pointer-events-auto">
          
          {/* Expandable Technical System Sheet (Collapsed by default) */}
          {showTechnicalPanel && (
            <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-4 sm:p-5 space-y-4 animate-in slide-in-from-bottom-3 duration-200 max-h-[70dvh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border-clean pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-ink" />
                    <span>System status & AI continuity</span>
                  </h3>
                  <p className="text-[11px] text-ink-mute">
                    Real-time inertial filter telemetry and motion constraints
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTechnicalPanel(false)}
                  aria-label="Close system status"
                  className="p-1.5 rounded-full text-ink-mute hover:text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subsystems Status List */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-canvas-soft rounded-xl border border-border-clean">
                  <span className="text-ink-mute font-medium">Satellite stream</span>
                  <span className={clsx(
                    'font-bold',
                    isSimulatingOutage ? 'text-rose-600' : gnssAvailable ? 'text-emerald-700' : 'text-ink-mute'
                  )}>
                    {isSimulatingOutage ? 'LOST (Testing)' : gnssAvailable ? 'ACTIVE (50 Hz)' : 'WAITING'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-canvas-soft rounded-xl border border-border-clean">
                  <span className="text-ink-mute font-medium">IMU strapdown</span>
                  <span className="font-bold text-emerald-700">
                    {imuAvailable ? 'ACTIVE (6-DoF)' : capabilities.deviceMotion ? 'READY' : 'AVAILABLE'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-canvas-soft rounded-xl border border-border-clean">
                  <span className="text-ink-mute font-medium">Kinematic NHC</span>
                  <span className={clsx('font-bold', nhcActive ? 'text-emerald-700' : 'text-ink-mute')}>
                    {nhcActive ? 'ENGAGED' : 'ARMED'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-canvas-soft rounded-xl border border-border-clean">
                  <span className="text-ink-mute font-medium">ZUPT detection</span>
                  <span className={clsx('font-bold', zuptActive ? 'text-emerald-700' : 'text-ink-mute')}>
                    {zuptActive ? 'STATIONARY LOCK' : 'ARMED'}
                  </span>
                </div>
              </div>

              {/* AI Motion Continuity Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-canvas-soft rounded-xl border border-border-clean space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">AI motion estimate</span>
                    <span className="font-mono font-bold text-ink">
                      {typeof aiVelocity === 'number' ? `${aiVelocity.toFixed(2)} m/s` : `${(speed || 0).toFixed(2)} m/s`}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-mute leading-snug">
                    E5 Dilated Temporal ConvNet supplies continuous longitudinal velocity during satellite loss.
                  </p>
                </div>

                <div className="p-3 bg-canvas-soft rounded-xl border border-border-clean space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">Calibrated uncertainty</span>
                    <span className="font-mono font-bold text-ink">
                      ±{typeof aiUncertainty === 'number' ? aiUncertainty.toFixed(2) : '0.25'} m/s
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-mute leading-snug">
                    U2 Heteroscedastic network regulates filter covariance to prevent runaway drift.
                  </p>
                </div>
              </div>

              {/* Outage Transition Stepper */}
              <div className="pt-2 border-t border-border-clean">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-mute uppercase mb-2">
                  <Layers className="w-3.5 h-3.5 text-ink" />
                  <span>Outage transition stages</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {stages.map((st, idx) => (
                    <div
                      key={st.id}
                      className={clsx(
                        'py-1.5 px-1 rounded-xl text-[10px] font-medium border transition-all truncate',
                        st.active
                          ? 'bg-[#083335] text-white border-[#083335] font-bold shadow-2xs'
                          : 'bg-canvas-soft text-ink-mute border-border-clean'
                      )}
                    >
                      <span className="block opacity-60 text-[9px] font-mono">0{idx + 1}</span>
                      <span className="truncate block">{st.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary End Session Option */}
              {isLive && (
                <div className="pt-2 border-t border-border-clean flex items-center justify-between">
                  <span className="text-xs text-ink-mute">Session management</span>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    aria-label="End test session"
                    className={clsx(
                      'px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border',
                      confirmEndSession
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white hover:bg-rose-50 text-rose-700 border-border-clean hover:border-rose-200'
                    )}
                  >
                    {confirmEndSession ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Confirm end test?</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>End test session</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Unified Compact Bottom Test HUD Card (64–80px) */}
          <div className="bg-white rounded-2xl border border-border-clean shadow-nav-floating p-3 sm:p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            {/* Left: Primary Contextual Action */}
            <div className="flex items-center gap-2">
              {!isLive ? (
                <button
                  type="button"
                  onClick={handleStartSession}
                  aria-label="Start test session"
                  className="h-11 px-5 bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white rounded-full text-xs sm:text-sm font-medium flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-97 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start test session</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleOutageSimulation}
                  aria-label={isSimulatingOutage ? 'Restore GNSS' : 'Simulate GNSS outage'}
                  className={clsx(
                    'h-11 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-97 shrink-0',
                    isSimulatingOutage
                      ? 'bg-white hover:bg-canvas-soft text-ink border border-border-clean'
                      : 'bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white'
                  )}
                >
                  {isSimulatingOutage ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Restore GNSS</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>Start GNSS outage test</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Center: Live Telemetry Chips (Clean & Minimal) */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-ink overflow-x-auto hide-scrollbar py-0.5">
              {/* Speed */}
              <div className="flex items-center gap-1 shrink-0">
                <Gauge className="w-3.5 h-3.5 text-ink-mute shrink-0" />
                <span className="font-bold tabular-nums font-mono text-sm">{isLive ? speedKmh : 0}</span>
                <span className="text-[11px] text-ink-mute">km/h</span>
              </div>

              {/* Heading */}
              {isHeadingValid && headingDeg !== null && (
                <>
                  <div className="h-4 w-px bg-border-clean shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Compass
                      className="w-3.5 h-3.5 text-ink-mute shrink-0 transition-transform duration-300"
                      style={{ transform: `rotate(${headingDeg}deg)` }}
                    />
                    <span className="font-bold tabular-nums font-mono text-xs">{headingDeg}°</span>
                    {cardinal && <span className="text-[11px] text-ink-mute">{cardinal}</span>}
                  </div>
                </>
              )}

              {/* Confidence */}
              {isLive && (
                <>
                  <div className="h-4 w-px bg-border-clean shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Activity className="w-3.5 h-3.5 text-ink-mute shrink-0" />
                    <span className="text-ink-mute">Conf:</span>
                    <span className="font-bold tabular-nums font-mono">{(confidence * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}

              {/* Error Bound */}
              {isLive && typeof accuracy === 'number' && accuracy > 0 && (
                <>
                  <div className="h-4 w-px bg-border-clean shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-ink-mute">Error:</span>
                    <span className="font-bold tabular-nums font-mono">±{accuracy.toFixed(1)}m</span>
                  </div>
                </>
              )}
            </div>

            {/* Right: Expandable System Status Trigger */}
            <button
              type="button"
              onClick={() => setShowTechnicalPanel((prev) => !prev)}
              aria-label="Toggle system status sheet"
              className={clsx(
                'h-11 px-3.5 sm:px-4 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border',
                showTechnicalPanel
                  ? 'bg-[#083335] text-white border-[#083335] shadow-2xs'
                  : 'bg-canvas-soft hover:bg-surface-pressed text-ink border-border-clean shadow-2xs'
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">System status</span>
              <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform duration-200', showTechnicalPanel && 'rotate-180')} />
            </button>
          </div>

        </div>
      </div>

      {/* 5. ACQUIRING GPS FIX NOTICE */}
      {!hasCoordinates && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center pointer-events-none p-4 text-center z-40">
          <div className="bg-white p-6 rounded-2xl border border-border-clean shadow-nav-floating space-y-2 max-w-sm">
            <Radio className="w-6 h-6 text-ink animate-pulse mx-auto" />
            <h4 className="font-semibold text-sm text-ink">Acquiring navigation fix</h4>
            <p className="text-xs text-ink-mute">
              {locPermission === 'denied'
                ? 'Please allow browser location permissions to run GNSS outage test.'
                : 'Connecting to GNSS satellites and motion sensors...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

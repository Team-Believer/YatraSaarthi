import React, { useState, useEffect } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useRouteStore } from '../../stores/useRouteStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useDemoOutage } from '../../hooks/useDemoOutage';
import { routeService } from '../../services/navigation/routeService';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import { locationService } from '../../services/location/locationService';
import { deriveGnssNavStatus, formatOutageDuration } from '../../utils/navigation/gnssStatus';
import { SpeedDisplay } from './SpeedDisplay';
import { HeadingDisplay } from './HeadingDisplay';
import { TripMetrics } from './TripMetrics';
import {
  Navigation2,
  Square,
  MapPin,
  AlertCircle,
  CarFront,
  Bike,
  Footprints,
  Loader2,
  RotateCw,
  Zap,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

interface TripHudCardProps {
  onRecenter?: () => void;
  className?: string;
}

export const TripHudCard: React.FC<TripHudCardProps> = ({
  className = '',
}) => {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showDemoControl, setShowDemoControl] = useState(false);

  // Store Subscriptions
  const isLive = useNavigationStore((s) => s.isLive);
  const isEnding = useNavigationStore((s) => s.isEnding);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const destination = useNavigationStore((s) => s.destination);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);
  const navState = useNavigationStore((s) => s.state);

  const travelMode = useRouteStore((s) => s.travelMode);

  const deviceLat = useLocationStore((s) => s.latitude);
  const deviceLon = useLocationStore((s) => s.longitude);
  const placeName = useLocationStore((s) => s.placeName);

  const currentLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const currentLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;

  const {
    isSimulating: isDemoOutageActive,
    outageSeconds: demoOutageSeconds,
    toggleOutage: toggleDemoOutage,
  } = useDemoOutage();

  // Reverse geocoding for current place
  useEffect(() => {
    if (currentLat !== null && currentLon !== null && !placeName) {
      locationService.reverseGeocode(currentLat, currentLon).catch(() => {});
    }
  }, [currentLat, currentLon, placeName]);

  const handleStartSession = async () => {
    try {
      const vehicleType = routeService.getVehicleTypeForMode(travelMode);
      await sessionLifecycle.startLiveSession(vehicleType);
    } catch (err: any) {
      console.warn('[TripHudCard] Navigation start notice:', err?.message || err);
    }
  };

  const handleEndSession = async () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 3500);
      return;
    }
    setConfirmEnd(false);
    try {
      await sessionLifecycle.endLiveSession();
    } catch (err: any) {
      console.error('Failed to end navigation session:', err);
    }
  };

  const getModeIcon = () => {
    switch (travelMode) {
      case 'driving':
        return <CarFront className="w-3.5 h-3.5" />;
      case 'motorcycle':
        return <Bike className="w-3.5 h-3.5" />;
      case 'cycling':
        return <Bike className="w-3.5 h-3.5" />;
      case 'walking':
        return <Footprints className="w-3.5 h-3.5" />;
    }
  };

  // Derive status from real session telemetry + demo outage state
  const gnssStatus = deriveGnssNavStatus({
    isLive,
    navigationMode: navState.navigation_mode,
    gnssAvailable: navState.gnss_available,
    gnssQuality: navState.gnss_quality,
    gnssOutageDuration: navState.gnss_outage_duration,
    environmentState: navState.environment_state,
    imuAvailable: navState.imu_available,
    isDemoOutageActive,
    demoOutageSeconds,
  });

  return (
    <div
      className={clsx(
        'w-full max-w-[860px] mx-auto bg-white/97 backdrop-blur-md rounded-[20px] select-none transition-all duration-200 border border-border-clean shadow-nav-floating overflow-hidden',
        gnssStatus.isDr ? 'ring-2 ring-amber-500/30' : '',
        className
      )}
    >
      {/* Prominent Outage Alert Banner (Appears during Dead Reckoning) */}
      {isLive && gnssStatus.isDr && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold font-body min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="tracking-tight uppercase font-heading text-[11px] font-bold text-amber-950">
              DEAD RECKONING · NO GPS
            </span>
            <span className="text-amber-800 text-[11px] font-mono">
              Outage {formatOutageDuration(gnssStatus.outageDurationSeconds)}
            </span>
          </div>

          {/* Quick Demo Outage Restore Action if triggered by demo */}
          {isDemoOutageActive && (
            <button
              type="button"
              onClick={toggleDemoOutage}
              className="px-2.5 py-0.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Restore GNSS
            </button>
          )}
        </div>
      )}

      {/* Main Driving Control Dock Row */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 min-h-[64px] flex items-center">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 w-full">
          {/* Left Block: Speed & Heading */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <SpeedDisplay compact={true} />
            <div className="h-6 w-px bg-border-clean shrink-0 hidden sm:block" />
            <div className="hidden sm:block">
              <HeadingDisplay compact={true} />
            </div>
          </div>

          {/* Center Block: Destination / Live Status */}
          <div className="min-w-0 flex-1 flex flex-col justify-center px-1">
            {isLive ? (
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Status chip */}
                  <div
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold font-body border shrink-0',
                      gnssStatus.badgeBg,
                      gnssStatus.badgeBorder,
                      gnssStatus.textColor
                    )}
                  >
                    <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', gnssStatus.dotColor, (gnssStatus.isDr || gnssStatus.isReacquiring) && 'animate-pulse')} />
                    <span>{gnssStatus.title}</span>
                  </div>

                  {destination && (
                    <span className="font-heading font-semibold text-xs sm:text-sm text-[#083335] truncate hidden sm:inline">
                      {destination.name}
                    </span>
                  )}
                </div>
              </div>
            ) : destination ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#083335] shrink-0">{getModeIcon()}</span>
                <span className="font-heading font-semibold text-[#083335] truncate text-xs sm:text-sm">
                  {destination.name}
                </span>
              </div>
            ) : (
              <div
                aria-label="Current location"
                className="flex items-center gap-1.5 min-w-0 text-slate-800"
              >
                <MapPin className="w-3.5 h-3.5 text-[#083335] shrink-0" />
                <span className="font-body font-medium text-xs sm:text-[13px] truncate text-slate-800">
                  {placeName || (currentLat !== null ? 'Finding location...' : 'Locating...')}
                </span>
              </div>
            )}
          </div>

          {/* Center Block: Live Trip Progress (Distance / Elapsed) */}
          {isLive && (
            <div className="hidden md:block">
              <TripMetrics compact={true} />
            </div>
          )}

          {/* Right Action: [ Start navigation ] or [ End drive ] + Demo toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {isLive ? (
              <>
                {/* Engineering / Demo Outage Trigger Pill */}
                <button
                  type="button"
                  onClick={() => setShowDemoControl((prev) => !prev)}
                  title="Demo Mode Outage Simulator"
                  className={clsx(
                    'h-10 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none',
                    isDemoOutageActive
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : showDemoControl
                      ? 'bg-[#083335]/10 text-[#083335] border-[#083335]/30'
                      : 'bg-white hover:bg-canvas-soft text-ink-mute hover:text-ink border-border-clean'
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Demo</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={isEnding}
                  aria-label="End navigation"
                  className={clsx(
                    'h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.97] border font-body shrink-0',
                    confirmEnd
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'
                      : 'bg-white hover:bg-canvas-soft text-ink border-border-clean shadow-2xs'
                  )}
                >
                  {confirmEnd ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-white" />
                      <span>Confirm end</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 fill-ink" />
                      <span>{isEnding ? 'Ending...' : 'End drive'}</span>
                    </>
                  )}
                </button>
              </>
            ) : destination ? (
              <button
                type="button"
                onClick={handleStartSession}
                disabled={sessionStatus === 'STARTING'}
                aria-label="Start navigation"
                className="h-10 px-3.5 sm:px-4 bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 shadow-nav-floating transition-colors cursor-pointer select-none active:scale-[0.97] font-body shrink-0"
              >
                {sessionStatus === 'STARTING' ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                    <span className="whitespace-nowrap">Starting...</span>
                  </>
                ) : sessionStatus === 'ERROR' ? (
                  <>
                    <RotateCw className="w-4 h-4 text-white shrink-0" />
                    <span className="whitespace-nowrap">Retry navigation</span>
                  </>
                ) : (
                  <>
                    <Navigation2 className="w-4 h-4 fill-white text-white rotate-45 shrink-0" />
                    <span className="whitespace-nowrap">Start navigation</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Demo Outage Control Drawer (When activated by user/judge) */}
      {isLive && (showDemoControl || isDemoOutageActive) && (
        <div className="bg-canvas-soft border-t border-border-clean/80 px-4 py-2.5 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">
              DEMO MODE
            </span>
            <span className="text-ink-body truncate hidden sm:inline">
              Suppresses GNSS packets; IMU continues streaming to backend OutageManager
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDemoOutageActive && (
              <span className="font-mono text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                DEMO OUTAGE {formatOutageDuration(demoOutageSeconds)}
              </span>
            )}

            <button
              type="button"
              onClick={toggleDemoOutage}
              className={clsx(
                'px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs',
                isDemoOutageActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              )}
            >
              {isDemoOutageActive ? 'Restore GNSS' : 'Simulate GNSS Outage'}
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM / SECONDARY: Compact Navigation Intelligence Strip */}
      {isLive && (
        <div className="bg-white/80 border-t border-border-clean/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-ink-mute font-body">
          <div className="flex items-center gap-3">
            {/* AI Velocity from state if present */}
            {typeof navState.ai_velocity === 'number' && navState.ai_velocity > 0 ? (
              <span className="flex items-center gap-1 font-mono text-ink">
                <Zap className="w-3 h-3 text-amber-600" />
                <span>E5 {navState.ai_velocity.toFixed(1)} m/s</span>
              </span>
            ) : (
              <span className="text-ink-mute">InEKF Inertial</span>
            )}

            {/* Position Confidence from state if present */}
            {typeof navState.position_confidence === 'number' && navState.position_confidence > 0 && (
              <span className="font-mono text-ink">
                Confidence {Math.round(navState.position_confidence * 100)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span>{navState.nhc_active ? 'NHC ✓' : 'NHC ·'}</span>
            <span>{navState.zupt_active ? 'ZUPT ✓' : 'ZUPT ·'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

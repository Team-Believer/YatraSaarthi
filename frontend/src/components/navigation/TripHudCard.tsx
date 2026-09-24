import React, { useState, useEffect } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useRouteStore } from '../../stores/useRouteStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { routeService } from '../../services/navigation/routeService';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import { locationService } from '../../services/location/locationService';
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

  // Store Subscriptions
  const isLive = useNavigationStore((s) => s.isLive);
  const isEnding = useNavigationStore((s) => s.isEnding);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const destination = useNavigationStore((s) => s.destination);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const travelMode = useRouteStore((s) => s.travelMode);

  const deviceLat = useLocationStore((s) => s.latitude);
  const deviceLon = useLocationStore((s) => s.longitude);
  const placeName = useLocationStore((s) => s.placeName);

  const currentLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const currentLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;

  // Automatically trigger reverse geocoding as soon as coordinates exist and place name is missing
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

  const navState = useNavigationStore((s) => s.state);
  const gnssAvailable = navState.gnss_available;
  const gnssQuality = navState.gnss_quality;
  const outageDuration = navState.gnss_outage_duration;
  const navMode = navState.navigation_mode;

  const getGnssStatusBadge = () => {
    if (!gnssAvailable || navMode === 'DR_ONLY' || navMode === 'INERTIAL_ONLY') {
      const formattedDuration = outageDuration > 0
        ? `00:${String(Math.floor(outageDuration)).padStart(2, '0')}`
        : '';
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold font-body shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span>Dead reckoning {formattedDuration && `· ${formattedDuration}`}</span>
        </div>
      );
    }
    if (gnssQuality === 'DEGRADED') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold font-body shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>GNSS degraded</span>
        </div>
      );
    }
    if (gnssQuality === 'RECOVERING') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-semibold font-body shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
          <span>GNSS recovering</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold font-body shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>GNSS signal</span>
      </div>
    );
  };

  return (
    <div
      className={clsx(
        'w-full max-w-[860px] mx-auto bg-white/97 backdrop-blur-md rounded-[18px] select-none transition-all duration-200 border border-border-clean shadow-nav-floating overflow-hidden',
        className
      )}
    >
      {/* Driving Control Dock Row (64-72px high) */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 min-h-[64px] flex items-center">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 w-full">
          {/* Left Block: Speed */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <SpeedDisplay compact={true} />
            <div className="h-6 w-px bg-border-clean shrink-0 hidden sm:block" />
            <div className="hidden sm:block">
              <HeadingDisplay compact={true} />
            </div>
          </div>

          {/* Center Block: Destination / Location / GNSS Status */}
          <div className="min-w-0 flex-1 flex flex-col justify-center px-1">
            {isLive ? (
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {getGnssStatusBadge()}
                  {destination && (
                    <span className="font-heading font-semibold text-xs sm:text-sm text-[#083335] truncate">
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

          {/* Center Block: Live Trip Progress (When live navigation active on desktop/tablet) */}
          {isLive && (
            <div className="hidden md:block">
              <TripMetrics compact={true} />
            </div>
          )}

          {/* Right Action: [ ↗ Start navigation ] or [ End drive ] */}
          <div className="flex items-center gap-2 shrink-0">
            {isLive ? (
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
    </div>
  );
};


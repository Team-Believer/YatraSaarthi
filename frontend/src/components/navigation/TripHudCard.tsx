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
  Play,
  Square,
  MapPin,
  AlertCircle,
  LocateFixed,
  CarFront,
  Bike,
  Footprints,
} from 'lucide-react';
import { clsx } from 'clsx';

interface TripHudCardProps {
  onRecenter?: () => void;
  className?: string;
}

export const TripHudCard: React.FC<TripHudCardProps> = ({
  onRecenter,
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
      alert(err.message || 'Failed to start navigation session');
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

  return (
    <div
      className={clsx(
        'w-full max-w-[860px] mx-auto bg-white rounded-2xl select-none transition-all duration-200 border border-[#E5E5E5] shadow-nav-floating overflow-hidden',
        className
      )}
    >
      {/* Single Main Driver HUD Row */}
      <div className="p-3.5 md:p-4">
        <div className="flex items-center justify-between gap-3 md:gap-4">
          {/* Left Block: Speed & Direction */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <SpeedDisplay compact={true} />
            <div className="h-6 w-px bg-[#E5E5E5] shrink-0" />
            <HeadingDisplay compact={true} />
          </div>

          {/* Center Block: Destination OR Single Current Location Name */}
          {destination ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F3F3F3] border border-[#E5E5E5] rounded-full text-xs max-w-[150px] sm:max-w-[180px] md:max-w-[220px] truncate">
              {getModeIcon()}
              <span className="font-medium text-ink truncate text-xs sm:text-[13px]">
                {destination.name}
              </span>
            </div>
          ) : (
            <div
              aria-label="Current location"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F3F3F3] border border-[#E5E5E5] rounded-full text-xs max-w-[150px] sm:max-w-[180px] md:max-w-[220px] truncate"
            >
              <MapPin className="w-3.5 h-3.5 text-ink shrink-0" />
              <span className="font-medium text-ink truncate text-xs sm:text-[13px]">
                {placeName || (currentLat !== null ? 'Finding location...' : 'Locating...')}
              </span>
            </div>
          )}

          {/* Center Block: Live Trip Progress (When live navigation active) */}
          {isLive && (
            <div className="hidden md:block">
              <TripMetrics compact={true} />
            </div>
          )}

          {/* Right Action & Control Group (No expand button) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Recenter Button */}
            {onRecenter && (
              <button
                type="button"
                onClick={onRecenter}
                aria-label="Recenter map"
                title="Recenter map"
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white hover:bg-canvas-soft border border-border-clean text-ink shadow-2xs flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96]"
              >
                <LocateFixed className="w-4.5 h-4.5 text-ink" />
              </button>
            )}

            {/* Primary Navigation Button */}
            {isLive ? (
              <button
                type="button"
                onClick={handleEndSession}
                disabled={isEnding}
                aria-label="End navigation"
                className={clsx(
                  'h-10 md:h-11 px-4 md:px-5 rounded-full text-xs md:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer select-none active:scale-[0.97] border',
                  confirmEnd
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
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
            ) : (
              <button
                type="button"
                onClick={handleStartSession}
                disabled={sessionStatus === 'STARTING'}
                aria-label="Start navigation"
                className="h-10 md:h-11 px-4 md:px-5 bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white rounded-full text-xs md:text-sm font-medium flex items-center gap-2 shadow-2xs transition-colors cursor-pointer select-none active:scale-[0.97]"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{sessionStatus === 'STARTING' ? 'Starting...' : 'Start navigation'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


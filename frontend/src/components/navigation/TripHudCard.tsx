import React, { useState } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useRouteStore } from '../../stores/useRouteStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { routeService } from '../../services/navigation/routeService';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import { SpeedDisplay } from './SpeedDisplay';
import { HeadingDisplay } from './HeadingDisplay';
import { TripMetrics } from './TripMetrics';
import { NavStatusPill } from './NavStatusPill';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import {
  Play,
  Square,
  ChevronUp,
  ChevronDown,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Store Subscriptions
  const isLive = useNavigationStore((s) => s.isLive);
  const isEnding = useNavigationStore((s) => s.isEnding);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const destination = useNavigationStore((s) => s.destination);
  const altitude = useNavigationStore((s) => s.state.altitude);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const travelMode = useRouteStore((s) => s.travelMode);

  const deviceLat = useLocationStore((s) => s.latitude);
  const deviceLon = useLocationStore((s) => s.longitude);

  const currentLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const currentLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;

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
        'w-full max-w-3xl mx-auto bg-white rounded-2xl select-none transition-all duration-200 border border-border-clean shadow-nav-floating overflow-hidden',
        className
      )}
    >
      {/* Mobile Top Drag / Expand Handle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex md:hidden items-center justify-center pt-2 pb-1 hover:bg-canvas-soft transition-colors cursor-pointer"
        aria-label={isExpanded ? 'Collapse navigation HUD' : 'Expand navigation HUD'}
      >
        <div className="w-10 h-1 bg-neutral-300 rounded-full" />
      </button>

      {/* Main Container Padding */}
      <div className="p-3.5 md:p-4">
        {/* COMPACT HUD VIEW (Always Visible) */}
        <div className="flex items-center justify-between gap-3 md:gap-4">
          {/* Left Block: Speed & Direction */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <SpeedDisplay compact={!isExpanded} />
            <div className="h-6 w-px bg-border-clean shrink-0" />
            <HeadingDisplay compact={!isExpanded} />
          </div>

          {/* Center Block: Destination & Travel Mode Summary */}
          {destination && (
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-canvas-soft border border-border-clean rounded-full text-xs max-w-xs truncate">
              {getModeIcon()}
              <span className="font-medium text-ink truncate">
                {destination.name}
              </span>
            </div>
          )}

          {/* Center Block: Live Trip Progress (If live navigation active) */}
          {isLive && (
            <div className="hidden md:block">
              <TripMetrics compact={!isExpanded} />
            </div>
          )}

          {/* Right Action & Control Group */}
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

            {/* Expand / Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
              title={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
              aria-expanded={isExpanded}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white hover:bg-canvas-soft border border-border-clean text-ink shadow-2xs flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.96]"
            >
              {isExpanded ? (
                <ChevronDown className="w-4.5 h-4.5 text-ink" />
              ) : (
                <ChevronUp className="w-4.5 h-4.5 text-ink" />
              )}
            </button>

            {/* Primary Navigation Button */}
            {isLive ? (
              <button
                type="button"
                onClick={handleEndSession}
                disabled={isEnding}
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
                className="h-10 md:h-11 px-4 md:px-5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs md:text-sm font-medium flex items-center gap-2 shadow-2xs transition-colors cursor-pointer select-none active:scale-[0.97]"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{sessionStatus === 'STARTING' ? 'Starting...' : 'Start navigation'}</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDED DETAILED HUD PANEL */}
        {isExpanded && (
          <div className="mt-3.5 pt-3.5 border-t border-border-clean flex flex-col gap-3 animate-in fade-in duration-150 max-h-[60vh] overflow-y-auto pr-0.5 hide-scrollbar">
            {/* Destination & Active Route Context */}
            {destination && (
              <div className="p-3 bg-canvas-soft rounded-2xl border border-border-clean flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-ink-mute uppercase tracking-wider block leading-none">
                      Destination
                    </span>
                    <h4 className="font-semibold text-ink text-xs sm:text-sm truncate mt-0.5">
                      {destination.name}
                    </h4>
                  </div>
                </div>
                <span className="text-xs text-ink font-medium shrink-0 bg-white px-3 py-1 rounded-full border border-border-clean shadow-2xs">
                  Active route
                </span>
              </div>
            )}

            {/* Status, Confidence & Coordinates */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <NavStatusPill />
                <ConfidenceIndicator />
              </div>

              {/* Coordinates */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-body bg-canvas-soft px-3 py-1.5 rounded-full border border-border-clean">
                <MapPin className="w-3.5 h-3.5 text-ink shrink-0" />
                {currentLat !== null && currentLon !== null ? (
                  <span>
                    {currentLat.toFixed(5)}, {currentLon.toFixed(5)}
                  </span>
                ) : (
                  <span>Acquiring fix...</span>
                )}
                {typeof altitude === 'number' && altitude !== 0 && (
                  <span className="text-ink-mute pl-1">
                    • {altitude.toFixed(0)}m
                  </span>
                )}
              </div>
            </div>

            {/* Live Trip Distance & Duration */}
            {isLive && (
              <div className="pt-1">
                <TripMetrics />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


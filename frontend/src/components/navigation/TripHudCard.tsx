import React, { useState } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import { SpeedDisplay } from './SpeedDisplay';
import { HeadingDisplay } from './HeadingDisplay';
import { TripMetrics } from './TripMetrics';
import { NavStatusPill } from './NavStatusPill';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import {
  Play,
  Square,
  Crosshair,
  ChevronUp,
  ChevronDown,
  MapPin,
  AlertCircle,
  Navigation as NavIcon,
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
  const zuptActive = useNavigationStore((s) => s.state.zupt_active);
  const nhcActive = useNavigationStore((s) => s.state.nhc_active);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const deviceLat = useLocationStore((s) => s.latitude);
  const deviceLon = useLocationStore((s) => s.longitude);

  const currentLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const currentLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;

  const handleStartSession = async () => {
    try {
      await sessionLifecycle.startLiveSession('CAR');
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

  return (
    <div
      className={clsx(
        'w-full max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl select-none transition-all duration-300 border border-slate-200/90 shadow-2xl overflow-hidden',
        className
      )}
    >
      {/* Mobile Top Drag / Expand Handle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex md:hidden items-center justify-center py-1.5 hover:bg-slate-100/50 transition-colors cursor-pointer"
        aria-label={isExpanded ? 'Collapse Navigation HUD' : 'Expand Navigation HUD'}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full" />
      </button>

      {/* Main Container Padding */}
      <div className="p-3 md:p-4">
        {/* COMPACT HUD VIEW (Always Visible) */}
        <div className="flex items-center justify-between gap-2.5 md:gap-4">
          {/* Left Block: Speed & Direction */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <SpeedDisplay compact={!isExpanded} />
            <div className="h-6 w-px bg-slate-200/80 hidden sm:block shrink-0" />
            <HeadingDisplay compact={!isExpanded} />
          </div>

          {/* Center Block: Destination / Route Summary (If active & space permits) */}
          {destination && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-brand-50/80 border border-brand-200/60 rounded-xl text-xs max-w-xs truncate">
              <NavIcon className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="font-semibold text-brand-900 truncate">
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Recenter Button */}
            {onRecenter && (
              <button
                type="button"
                onClick={onRecenter}
                title="Recenter camera on vehicle"
                className="p-2 md:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors press-scale flex items-center justify-center border border-slate-200/80 cursor-pointer"
              >
                <Crosshair className="w-4 h-4 text-brand-600" />
              </button>
            )}

            {/* Expand / Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse HUD' : 'Expand Detailed HUD'}
              className="p-2 md:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors press-scale flex items-center justify-center border border-slate-200/80 cursor-pointer"
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            {/* Primary Live Navigation Button */}
            {isLive ? (
              <button
                type="button"
                onClick={handleEndSession}
                disabled={isEnding}
                className={clsx(
                  'font-semibold px-3.5 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition-all shadow-md cursor-pointer press-scale select-none',
                  confirmEnd
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-rose-600/20'
                )}
              >
                {confirmEnd ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                    <span>Confirm End</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
                    <span>{isEnding ? 'Ending...' : 'End Drive'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartSession}
                disabled={sessionStatus === 'STARTING'}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-3.5 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition-all shadow-md shadow-brand-600/25 press-scale cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
                <span>{sessionStatus === 'STARTING' ? 'Starting...' : 'Start Drive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDED DETAILED HUD PANEL */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[60vh] overflow-y-auto pr-0.5 hide-scrollbar">
            {/* Expanded Row 1: Destination & Active Route Context */}
            {destination && (
              <div className="p-3 bg-brand-50/70 rounded-2xl border border-brand-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block leading-none">
                      Navigation Destination
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate mt-0.5">
                      {destination.name}
                    </h4>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-brand-700 font-semibold shrink-0 bg-white px-2 py-0.5 rounded-lg border border-brand-200">
                  Active Route
                </span>
              </div>
            )}

            {/* Expanded Row 2: Status, Confidence & Coordinates */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <NavStatusPill />
                <ConfidenceIndicator />
              </div>

              {/* Verified Live Coordinates */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/70">
                <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                {currentLat !== null && currentLon !== null ? (
                  <span>
                    {currentLat.toFixed(5)}, {currentLon.toFixed(5)}
                  </span>
                ) : (
                  <span>Waiting for coordinates...</span>
                )}
                {typeof altitude === 'number' && altitude !== 0 && (
                  <span className="text-slate-400 pl-1">
                    • {altitude.toFixed(0)}m elev
                  </span>
                )}
              </div>
            </div>

            {/* Expanded Row 3: Live Trip Distance & Duration */}
            {isLive && (
              <div className="pt-1">
                <TripMetrics />
              </div>
            )}

            {/* Expanded Row 4: Motion Constraints & Filter Mode */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  InEKF Filter Mode
                </span>
                <div className="font-semibold text-slate-900 truncate mt-0.5">
                  {isLive ? navMode : 'Standby'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Stationary Hold (ZUPT)
                </span>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      zuptActive ? 'bg-emerald-500' : 'bg-slate-300'
                    )}
                  />
                  {zuptActive ? 'Engaged' : 'Inactive'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Vehicle Constraint (NHC)
                </span>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      nhcActive ? 'bg-emerald-500' : 'bg-slate-300'
                    )}
                  />
                  {nhcActive ? 'Constrained' : 'Ready'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import { NavStatusPill } from './NavStatusPill';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import {
  Play,
  Square,
  Crosshair,
  Compass,
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock,
  Milestone,
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Store Subscriptions
  const isLive = useNavigationStore((s) => s.isLive);
  const isEnding = useNavigationStore((s) => s.isEnding);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const speed = useNavigationStore((s) => s.state.speed);
  const headingDeg = useNavigationStore((s) => s.state.heading_deg);
  const altitude = useNavigationStore((s) => s.state.altitude);
  const zuptActive = useNavigationStore((s) => s.state.zupt_active);
  const nhcActive = useNavigationStore((s) => s.state.nhc_active);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);
  const trajectory = useNavigationStore((s) => s.trajectory);
  const destination = useNavigationStore((s) => s.destination);

  const deviceLat = useLocationStore((s) => s.latitude);
  const deviceLon = useLocationStore((s) => s.longitude);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  // Active Coordinates
  const currentLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const currentLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;

  // Track session elapsed time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLive) {
      if (!startTime) setStartTime(Date.now());
      interval = setInterval(() => {
        if (startTime) {
          setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
    } else {
      setStartTime(null);
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, startTime]);

  // Compute live distance from trajectory (approximate km)
  let calculatedDistanceKm = 0;
  if (trajectory.length > 1) {
    for (let i = 1; i < trajectory.length; i++) {
      const [lon1, lat1] = trajectory[i - 1];
      const [lon2, lat2] = trajectory[i];
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      calculatedDistanceKm += R * c;
    }
  }

  // Format Elapsed Time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Convert Heading to Cardinal Direction
  const getCardinal = (deg: number): string => {
    const normalized = ((deg % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'N';
    if (normalized >= 22.5 && normalized < 67.5) return 'NE';
    if (normalized >= 67.5 && normalized < 112.5) return 'E';
    if (normalized >= 112.5 && normalized < 157.5) return 'SE';
    if (normalized >= 157.5 && normalized < 202.5) return 'S';
    if (normalized >= 202.5 && normalized < 247.5) return 'SW';
    if (normalized >= 247.5 && normalized < 292.5) return 'W';
    return 'NW';
  };

  // Speed in km/h
  const speedKmh = isLive && typeof speed === 'number' ? Math.max(0, speed * 3.6) : 0;
  const cardinal = isLive ? getCardinal(headingDeg) : 'N';

  const handleStartSession = async () => {
    try {
      await sessionLifecycle.startLiveSession('CAR');
    } catch (err: any) {
      alert(err.message || 'Failed to start navigation session');
    }
  };

  const handleEndSession = async () => {
    try {
      await sessionLifecycle.endLiveSession();
    } catch (err: any) {
      console.error('Failed to end navigation session:', err);
    }
  };

  return (
    <div
      className={clsx(
        'w-full max-w-4xl mx-auto nav-glass rounded-2xl md:rounded-hud p-3.5 md:p-5 select-none transition-all duration-300 border border-slate-200/90 shadow-nav-sheet',
        className
      )}
    >
      {/* Primary HUD Row */}
      <div className="flex items-center justify-between gap-3 md:gap-6">
        {/* Speedometer & Direction Block */}
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          {/* Large Digital Speedometer */}
          <div className="flex items-baseline gap-1.5 shrink-0 bg-slate-900 text-white px-3.5 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl shadow-inner">
            <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight tabular-nums leading-none">
              {speedKmh.toFixed(0)}
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase">
              km/h
            </span>
          </div>

          {/* Compass & Heading */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Compass
                className="w-4 h-4 text-brand-600 transition-transform duration-300"
                style={{ transform: `rotate(${headingDeg}deg)` }}
              />
              <span className="text-sm md:text-base font-bold text-slate-900 tabular-nums">
                {isLive ? `${Math.round(headingDeg)}°` : '---°'}
              </span>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60">
                {cardinal}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 hidden sm:inline">
              Bearing & Heading
            </span>
          </div>
        </div>

        {/* Live Trip Stats (Distance & Duration) */}
        {isLive && (
          <div className="hidden sm:flex items-center gap-4 md:gap-6 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="flex items-center gap-2">
              <Milestone className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                  Distance
                </div>
                <div className="text-xs md:text-sm font-bold text-slate-900 font-mono mt-0.5">
                  {calculatedDistanceKm < 1
                    ? `${(calculatedDistanceKm * 1000).toFixed(0)} m`
                    : `${calculatedDistanceKm.toFixed(2)} km`}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                  Elapsed
                </div>
                <div className="text-xs md:text-sm font-bold text-slate-900 font-mono mt-0.5">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls Group */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Recenter Button */}
          {onRecenter && (
            <button
              onClick={onRecenter}
              title="Recenter Camera on Vehicle"
              className="p-2.5 md:p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors press-scale flex items-center justify-center border border-slate-200/80"
            >
              <Crosshair className="w-4 h-4 md:w-4.5 md:h-4.5 text-brand-600" />
            </button>
          )}

          {/* Diagnostics Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle Detailed HUD Metrics"
            className="p-2.5 md:p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors press-scale flex items-center justify-center border border-slate-200/80"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 md:w-4.5 md:h-4.5" />
            ) : (
              <ChevronUp className="w-4 h-4 md:w-4.5 md:h-4.5" />
            )}
          </button>

          {/* Primary Live Navigation Action */}
          {isLive ? (
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm flex items-center gap-2 transition-all shadow-md shadow-rose-600/20 press-scale"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{isEnding ? 'Ending...' : 'End Navigation'}</span>
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={sessionStatus === 'STARTING'}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-brand-600/25 press-scale"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{sessionStatus === 'STARTING' ? 'Starting...' : 'Start Drive'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Status Strip */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <NavStatusPill />
          <ConfidenceIndicator />
        </div>

        {/* Current Coordinates */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
          <MapPin className="w-3.5 h-3.5 text-brand-600" />
          {currentLat !== null && currentLon !== null ? (
            <span>
              {currentLat.toFixed(5)}, {currentLon.toFixed(5)}
            </span>
          ) : (
            <span>Acquiring position fix...</span>
          )}
          {altitude !== 0 && (
            <span className="text-slate-400 pl-1">
              • {altitude.toFixed(0)}m elev
            </span>
          )}
        </div>
      </div>

      {/* Expandable InEKF & Hardware Telemetry Details */}
      {isExpanded && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
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
              Zero-Velocity (ZUPT)
            </span>
            <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  zuptActive ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              />
              {zuptActive ? 'Engaged (Stationary)' : 'Inactive'}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Non-Holonomic (NHC)
            </span>
            <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  nhcActive ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              />
              {nhcActive ? 'Active Constrained' : 'Ready'}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Route Target
            </span>
            <div className="font-semibold text-brand-700 truncate mt-0.5">
              {destination ? destination.name : 'Free Navigation'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

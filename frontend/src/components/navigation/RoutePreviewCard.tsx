import React from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useRouteStore } from '../../stores/useRouteStore';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import {
  MapPin,
  Play,
  X,
  Milestone,
  Clock,
  Navigation,
} from 'lucide-react';
import { clsx } from 'clsx';

interface RoutePreviewCardProps {
  onStart?: () => void;
  className?: string;
}

export const RoutePreviewCard: React.FC<RoutePreviewCardProps> = ({
  onStart,
  className,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const destination = useNavigationStore((s) => s.destination);
  const setDestination = useNavigationStore((s) => s.setDestination);
  const setRouteCoordinates = useNavigationStore((s) => s.setRouteCoordinates);

  const activeRoute = useRouteStore((s) => s.activeRoute);
  const clearRoute = useRouteStore((s) => s.clearRoute);

  // Render ONLY during route preview (destination selected, but navigation not live)
  if (isLive || !destination) return null;

  const handleStartDrive = async () => {
    try {
      if (onStart) onStart();
      await sessionLifecycle.startLiveSession('CAR');
    } catch (err: any) {
      alert(err.message || 'Failed to start navigation session');
    }
  };

  const handleCancel = () => {
    setDestination(null);
    setRouteCoordinates(null);
    clearRoute();
  };

  // Format real distance from activeRoute if available
  const distanceMeters = activeRoute?.distance_meters;
  const formattedDistance =
    typeof distanceMeters === 'number' && distanceMeters > 0
      ? distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m`
        : `${(distanceMeters / 1000).toFixed(1)} km`
      : null;

  // Format real duration from activeRoute if available
  const durationSecs = activeRoute?.duration_seconds;
  const formattedDuration =
    typeof durationSecs === 'number' && durationSecs > 0
      ? durationSecs >= 3600
        ? `${Math.floor(durationSecs / 3600)}h ${Math.round((durationSecs % 3600) / 60)}m`
        : `${Math.round(durationSecs / 60)} min`
      : null;

  return (
    <div
      className={clsx(
        'w-full max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-4 shadow-nav-sheet border border-slate-200/90 select-none animate-in fade-in slide-in-from-bottom-4 duration-200',
        className
      )}
    >
      {/* Header: Destination info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block leading-none">
              Route Preview
            </span>
            <h3 className="font-bold text-slate-900 text-sm md:text-base truncate mt-0.5">
              {destination.name}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
          title="Clear route"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Row (Only if real Mapbox route data exists) */}
      {(formattedDistance || formattedDuration) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs">
          {formattedDistance && (
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold font-mono">
              <Milestone className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDistance}</span>
            </div>
          )}

          {formattedDuration && (
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDuration}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium ml-auto bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
            <Navigation className="w-3 h-3 text-emerald-600" />
            <span>Fastest Route</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleStartDrive}
          disabled={sessionStatus === 'STARTING'}
          className="flex-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-600/25 press-scale cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{sessionStatus === 'STARTING' ? 'Starting Drive...' : 'Start Navigation'}</span>
        </button>
      </div>
    </div>
  );
};

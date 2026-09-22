import React from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import {
  X,
  Satellite,
  Compass,
  AlertTriangle,
  RotateCw,
  ShieldCheck,
  Activity,
  Gauge,
  Clock,
  Navigation,
  Sliders,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NavStatusDrawer: React.FC<NavStatusDrawerProps> = ({ isOpen, onClose }) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const state = useNavigationStore((s) => s.state);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const locPermission = useLocationStore((s) => s.permission);

  if (!isOpen) return null;

  // Format outage timer
  const formatOutage = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Derive state category and driver-first description
  const navMode = (state.navigation_mode || '').toUpperCase();
  const gnssAvailable = state.gnss_available;
  const outageDuration = state.gnss_outage_duration || 0;
  const gnssQuality = state.gnss_quality || 'UNKNOWN';

  let statusTitle = 'GNSS SIGNAL';
  let statusBadgeClass = 'bg-emerald-500 text-white';
  let statusBgClass = 'bg-emerald-50 border-emerald-200 text-emerald-950';
  let statusIcon = <Satellite className="w-5 h-5 text-emerald-600" />;
  let statusDesc = 'High-precision GNSS positioning combined with continuous InEKF sensor fusion.';

  if (isLive || sessionStatus === 'LIVE') {
    if (navMode.includes('REACQUISITION') || navMode.includes('RECOVERY')) {
      statusTitle = 'GNSS RECOVERING';
      statusBadgeClass = 'bg-sky-500 text-white animate-pulse';
      statusBgClass = 'bg-sky-50 border-sky-200 text-sky-950';
      statusIcon = <RotateCw className="w-5 h-5 text-sky-600 animate-spin" />;
      statusDesc = 'GNSS satellite signals detected. Validating positional consistency before restoring full GNSS navigation.';
    } else if (
      navMode.includes('DEAD_RECKONING') ||
      navMode.includes('LOST') ||
      !gnssAvailable ||
      state.environment_state === 'TUNNEL'
    ) {
      statusTitle = 'DEAD RECKONING ACTIVE';
      statusBadgeClass = 'bg-amber-500 text-white animate-pulse';
      statusBgClass = 'bg-amber-50 border-amber-200 text-amber-950';
      statusIcon = <Compass className="w-5 h-5 text-amber-600" />;
      statusDesc = 'GNSS satellite signal is currently unavailable. The vehicle continues uninterrupted navigation using high-rate IMU dead reckoning and kinematic motion constraints.';
    } else if (navMode.includes('DEGRADING') || gnssQuality === 'POOR' || gnssQuality === 'FAIR') {
      statusTitle = 'GNSS DEGRADED';
      statusBadgeClass = 'bg-amber-500 text-white';
      statusBgClass = 'bg-amber-50 border-amber-200 text-amber-950';
      statusIcon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
      statusDesc = 'GNSS satellite signal quality is degraded. Inertial sensors are actively aiding positioning to maintain accuracy.';
    }
  } else if (sessionStatus === 'STARTING') {
    statusTitle = 'STARTING SESSION...';
    statusBadgeClass = 'bg-blue-500 text-white animate-pulse';
    statusBgClass = 'bg-blue-50 border-blue-200 text-blue-950';
    statusIcon = <Activity className="w-5 h-5 text-blue-600" />;
    statusDesc = 'Connecting to real-time navigation server and initializing InEKF filter.';
  } else if (locPermission === 'denied') {
    statusTitle = 'PERMISSION REQUIRED';
    statusBadgeClass = 'bg-rose-500 text-white';
    statusBgClass = 'bg-rose-50 border-rose-200 text-rose-950';
    statusIcon = <AlertTriangle className="w-5 h-5 text-rose-600" />;
    statusDesc = 'Browser location permission was denied. Please allow location access in your browser settings.';
  } else {
    statusTitle = 'SYSTEM READY';
    statusBadgeClass = 'bg-slate-700 text-white';
    statusBgClass = 'bg-slate-50 border-slate-200 text-slate-900';
    statusIcon = <ShieldCheck className="w-5 h-5 text-brand-600" />;
    statusDesc = 'Hardware sensors and navigation engine are in standby mode, ready to navigate.';
  }

  // Confidence & Accuracy (only show if real values exist)
  const hasConfidence = isLive && typeof state.position_confidence === 'number' && state.position_confidence > 0;
  const confidencePct = hasConfidence ? Math.round(state.position_confidence * 100) : null;
  const accuracyMeters = isLive && typeof state.horizontal_accuracy === 'number' && state.horizontal_accuracy > 0
    ? state.horizontal_accuracy
    : null;

  // Environment Display Helper
  const formatEnvironment = (env: string) => {
    switch (env) {
      case 'TUNNEL':
        return 'Tunnel (Zero GNSS)';
      case 'UNDERPASS':
        return 'Underpass / Overpass';
      case 'URBAN_CANYON':
        return 'Urban Canyon';
      case 'PARKING_STRUCTURE':
        return 'Indoor Parking Structure';
      case 'NORMAL_ROAD':
        return 'Open Sky Road';
      default:
        return env ? env.replace(/_/g, ' ') : 'Standard Road';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop touch dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Drawer/Sheet Card */}
      <div
        className={clsx(
          'relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 z-10 transition-transform animate-in slide-in-from-bottom-6 duration-300 p-5 sm:p-6 select-none flex flex-col gap-5'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Navigation Status
              </h2>
              <p className="text-xs text-slate-500">
                Real-time InEKF navigation & GNSS telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors press-scale"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary State Banner */}
        <div className={clsx('p-4 rounded-2xl border flex flex-col gap-2.5', statusBgClass)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusIcon}
              <span className="font-bold text-sm tracking-tight">{statusTitle}</span>
            </div>
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', statusBadgeClass)}>
              {isLive ? 'LIVE' : sessionStatus}
            </span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">{statusDesc}</p>

          {/* Outage Duration Highlight if Active */}
          {outageDuration > 0 && (
            <div className="mt-1 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-medium text-amber-900">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                GNSS Outage Duration:
              </span>
              <span className="font-mono font-bold text-sm text-amber-950 bg-amber-200/50 px-2 py-0.5 rounded-lg border border-amber-300">
                {formatOutage(outageDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Grid: Confidence & Accuracy */}
        <div className="grid grid-cols-2 gap-3">
          {/* Confidence */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-medium">Confidence</span>
              <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
              {confidencePct !== null ? `${confidencePct}%` : 'Unavailable'}
            </div>
            <span className="text-[10.5px] text-slate-400">
              {confidencePct !== null && confidencePct >= 80
                ? 'High position fidelity'
                : confidencePct !== null && confidencePct >= 50
                ? 'Moderate estimation'
                : 'Estimating with IMU'}
            </span>
          </div>

          {/* Estimated Accuracy */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-medium">Est. Accuracy</span>
              <Gauge className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
              {accuracyMeters !== null ? `±${accuracyMeters.toFixed(1)} m` : 'Unavailable'}
            </div>
            <span className="text-[10.5px] text-slate-400">
              Horizontal error bounds
            </span>
          </div>
        </div>

        {/* Technical Telemetry Details */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-brand-600" />
            System Telemetry Breakdown
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* GNSS Availability */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">GNSS Signal</span>
              <span
                className={clsx(
                  'font-bold',
                  state.gnss_available ? 'text-emerald-600' : 'text-amber-600'
                )}
              >
                {state.gnss_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            {/* GNSS Quality */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">GNSS Quality</span>
              <span className="font-bold text-slate-800">
                {state.gnss_quality || 'Unavailable'}
              </span>
            </div>

            {/* Non-Holonomic Constraint */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Motion Constraint (NHC)</span>
              <span
                className={clsx(
                  'font-bold',
                  state.nhc_active ? 'text-emerald-600' : 'text-slate-400'
                )}
              >
                {state.nhc_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Stationary Hold (ZUPT) */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Stationary Hold (ZUPT)</span>
              <span
                className={clsx(
                  'font-bold',
                  state.zupt_active ? 'text-emerald-600' : 'text-slate-400'
                )}
              >
                {state.zupt_active ? 'Engaged' : 'Inactive'}
              </span>
            </div>

            {/* Environment */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Environment</span>
              <span className="font-bold text-slate-800 truncate max-w-[120px]" title={state.environment_state}>
                {formatEnvironment(state.environment_state)}
              </span>
            </div>

            {/* Filter Alignment */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Filter Alignment</span>
              <span className="font-bold text-slate-800">
                {state.alignment_status ? state.alignment_status.replace(/_/g, ' ') : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Fused Coordinates */}
          {fusedPosition && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Position: {fusedPosition.latitude.toFixed(6)}, {fusedPosition.longitude.toFixed(6)}</span>
              <span>Speed: {(fusedPosition.speed * 3.6).toFixed(1)} km/h</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors press-scale"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

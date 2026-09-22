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

  // Format outage timer mm:ss
  const formatOutage = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // State flags
  const isStarting = sessionStatus === 'STARTING';
  const isEnding = sessionStatus === 'ENDING';
  const isLiveNav = isLive || sessionStatus === 'LIVE';
  const hasTelemetry = isLiveNav && (state.packets_received > 0 || state.timestamp > 0 || fusedPosition !== null);
  const isStandby = !isLiveNav && !isStarting && !isEnding;

  const navMode = (state.navigation_mode || '').toUpperCase();
  const gnssAvailable = state.gnss_available;
  const outageDuration = state.gnss_outage_duration || 0;
  const gnssQuality = (state.gnss_quality || '').toUpperCase();

  const isRecovering = isLiveNav && (navMode.includes('REACQUISITION') || navMode.includes('RECOVERY'));
  const isDrActive = isLiveNav && (navMode.includes('DEAD_RECKONING') || navMode.includes('LOST') || !gnssAvailable || state.environment_state === 'TUNNEL');
  const isDegraded = isLiveNav && !isDrActive && !isRecovering && (navMode.includes('DEGRADING') || gnssQuality === 'POOR' || gnssQuality === 'FAIR');

  // Primary State Banner Derivation
  let statusTitle = 'SYSTEM READY';
  let statusBadge = 'IDLE';
  let statusBadgeClass = 'bg-slate-700 text-white';
  let statusBgClass = 'bg-slate-50 border-slate-200 text-slate-900';
  let statusIcon = <ShieldCheck className="w-5 h-5 text-brand-600" />;
  let statusDesc = 'Ready to start navigation. Hardware sensors calibrated and navigation engine on standby.';

  if (locPermission === 'denied') {
    statusTitle = 'LOCATION PERMISSION REQUIRED';
    statusBadge = 'PERMISSION';
    statusBadgeClass = 'bg-rose-500 text-white';
    statusBgClass = 'bg-rose-50 border-rose-200 text-rose-950';
    statusIcon = <AlertTriangle className="w-5 h-5 text-rose-600" />;
    statusDesc = 'Browser location permission is disabled. Please allow location access in your browser settings to proceed.';
  } else if (isStarting || (isLiveNav && !hasTelemetry)) {
    statusTitle = 'NAVIGATION INITIALIZING';
    statusBadge = 'STARTING';
    statusBadgeClass = 'bg-blue-500 text-white animate-pulse';
    statusBgClass = 'bg-blue-50 border-blue-200 text-blue-950';
    statusIcon = <Activity className="w-5 h-5 text-blue-600" />;
    statusDesc = 'Connecting to real-time navigation server and establishing sensor fusion...';
  } else if (isRecovering) {
    statusTitle = 'GNSS RECOVERING';
    statusBadge = 'RECOVERING';
    statusBadgeClass = 'bg-sky-500 text-white animate-pulse';
    statusBgClass = 'bg-sky-50 border-sky-200 text-sky-950';
    statusIcon = <RotateCw className="w-5 h-5 text-sky-600 animate-spin" />;
    statusDesc = 'GNSS satellite signals reacquired. Validating positional consistency before restoring full GNSS navigation.';
  } else if (isDrActive) {
    statusTitle = 'DEAD RECKONING ACTIVE';
    statusBadge = 'DEAD RECKONING';
    statusBadgeClass = 'bg-amber-500 text-white animate-pulse';
    statusBgClass = 'bg-amber-50 border-amber-200 text-amber-950';
    statusIcon = <Compass className="w-5 h-5 text-amber-600" />;
    statusDesc = 'GNSS satellite signal is currently unavailable. Continuing uninterrupted navigation using high-rate IMU dead reckoning and kinematic motion constraints.';
  } else if (isDegraded) {
    statusTitle = 'GNSS DEGRADED';
    statusBadge = 'DEGRADED';
    statusBadgeClass = 'bg-amber-500 text-white';
    statusBgClass = 'bg-amber-50 border-amber-200 text-amber-950';
    statusIcon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
    statusDesc = 'GNSS satellite signal quality is degraded. Inertial sensors are actively aiding positioning to maintain accuracy.';
  } else if (isLiveNav && hasTelemetry) {
    statusTitle = 'GNSS-AIDED NAVIGATION';
    statusBadge = 'LIVE';
    statusBadgeClass = 'bg-emerald-500 text-white';
    statusBgClass = 'bg-emerald-50 border-emerald-200 text-emerald-950';
    statusIcon = <Satellite className="w-5 h-5 text-emerald-600" />;
    statusDesc = 'High-precision multi-constellation GNSS positioning fused with continuous InEKF dead reckoning.';
  }

  // Confidence & Accuracy Formatting
  let confidenceDisplay = 'Standby';
  let confidenceSubtext = 'Available when navigation starts';
  let confidenceClass = 'text-slate-600 font-semibold';

  if (isStandby) {
    confidenceDisplay = 'Standby';
    confidenceSubtext = 'Available when navigation starts';
    confidenceClass = 'text-slate-500 font-semibold text-lg sm:text-xl';
  } else if (isStarting || !hasTelemetry) {
    confidenceDisplay = 'Estimating...';
    confidenceSubtext = 'Waiting for navigation telemetry';
    confidenceClass = 'text-blue-600 font-semibold text-lg sm:text-xl';
  } else if (hasTelemetry && typeof state.position_confidence === 'number' && state.position_confidence > 0) {
    const pct = Math.round(state.position_confidence * 100);
    confidenceDisplay = `${pct}%`;
    confidenceClass = 'text-slate-900 font-bold font-mono text-xl sm:text-2xl';
    confidenceSubtext = pct >= 80 ? 'High position fidelity' : pct >= 50 ? 'Moderate estimation' : 'Inertial estimation';
  } else {
    confidenceDisplay = 'Estimating...';
    confidenceSubtext = 'Inertial position filter active';
    confidenceClass = 'text-slate-700 font-semibold text-lg sm:text-xl';
  }

  let accuracyDisplay = 'Standby';
  let accuracySubtext = 'Available during navigation';
  let accuracyClass = 'text-slate-600 font-semibold';

  if (isStandby) {
    accuracyDisplay = 'Standby';
    accuracySubtext = 'Available during navigation';
    accuracyClass = 'text-slate-500 font-semibold text-lg sm:text-xl';
  } else if (isStarting || !hasTelemetry) {
    accuracyDisplay = 'Estimating...';
    accuracySubtext = 'Validating error bounds';
    accuracyClass = 'text-blue-600 font-semibold text-lg sm:text-xl';
  } else if (hasTelemetry && typeof state.horizontal_accuracy === 'number' && state.horizontal_accuracy > 0) {
    accuracyDisplay = `±${state.horizontal_accuracy.toFixed(1)} m`;
    accuracyClass = 'text-slate-900 font-bold font-mono text-xl sm:text-2xl';
    accuracySubtext = 'Horizontal error bounds';
  } else {
    accuracyDisplay = 'Validating...';
    accuracySubtext = 'Estimating position bounds';
    accuracyClass = 'text-slate-700 font-semibold text-lg sm:text-xl';
  }

  // Environment Display Helper
  const getEnvironmentDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-slate-500' };
    if (!hasTelemetry) return { text: 'Detecting...', className: 'text-blue-600' };

    const env = state.environment_state;
    switch (env) {
      case 'TUNNEL':
        return { text: 'Tunnel (Inertial DR)', className: 'text-amber-700 font-semibold' };
      case 'UNDERPASS':
        return { text: 'Underpass / Overpass', className: 'text-amber-700 font-semibold' };
      case 'URBAN_CANYON':
        return { text: 'Urban Canyon', className: 'text-amber-700 font-semibold' };
      case 'PARKING_STRUCTURE':
        return { text: 'Indoor Parking', className: 'text-amber-700 font-semibold' };
      case 'NORMAL_ROAD':
        return { text: 'Open Sky Road', className: 'text-emerald-700 font-semibold' };
      default:
        return env && env !== 'UNKNOWN'
          ? { text: env.replace(/_/g, ' '), className: 'text-slate-800 font-semibold' }
          : { text: 'Detecting...', className: 'text-slate-600' };
    }
  };

  // GNSS Signal State Helper
  const getGnssSignalDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-slate-500' };
    if (!hasTelemetry) return { text: 'Waiting...', className: 'text-blue-600' };
    if (isRecovering) return { text: 'Recovering', className: 'text-sky-600 font-bold' };
    if (isDrActive) return { text: 'Unavailable', className: 'text-amber-600 font-bold' };
    if (isDegraded) return { text: 'Degraded', className: 'text-amber-600 font-bold' };
    if (gnssAvailable) return { text: 'Available', className: 'text-emerald-600 font-bold' };
    return { text: 'Standby', className: 'text-slate-500' };
  };

  // GNSS Quality State Helper
  const getGnssQualityDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-slate-500' };
    if (!hasTelemetry) return { text: 'Detecting...', className: 'text-blue-600' };
    if (isDrActive) return { text: 'Lost', className: 'text-amber-600 font-bold' };
    if (gnssQuality && gnssQuality !== 'UNKNOWN') {
      if (gnssQuality === 'EXCELLENT' || gnssQuality === 'GOOD') {
        return { text: gnssQuality, className: 'text-emerald-600 font-bold' };
      }
      if (gnssQuality === 'FAIR' || gnssQuality === 'POOR') {
        return { text: gnssQuality, className: 'text-amber-600 font-bold' };
      }
      return { text: gnssQuality, className: 'text-slate-800 font-bold' };
    }
    return { text: 'Standby', className: 'text-slate-500' };
  };

  // NHC & ZUPT State Helpers
  const getNhcDisplay = () => {
    if (isStandby || !hasTelemetry) return { text: 'Standby', className: 'text-slate-500' };
    return state.nhc_active
      ? { text: 'Active', className: 'text-emerald-600 font-bold' }
      : { text: 'Inactive', className: 'text-slate-400' };
  };

  const getZuptDisplay = () => {
    if (isStandby || !hasTelemetry) return { text: 'Standby', className: 'text-slate-500' };
    return state.zupt_active
      ? { text: 'Engaged', className: 'text-emerald-600 font-bold' }
      : { text: 'Inactive', className: 'text-slate-400' };
  };

  // Filter Alignment Helper
  const getAlignmentDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-slate-500' };
    if (!hasTelemetry) return { text: 'Aligning...', className: 'text-blue-600' };
    const status = state.alignment_status;
    if (status === 'ALIGNED') return { text: 'Aligned', className: 'text-emerald-600 font-bold' };
    if (status === 'ALIGNING') return { text: 'Aligning...', className: 'text-blue-600' };
    if (status === 'UNALIGNED') return { text: 'Unaligned', className: 'text-amber-600 font-bold' };
    return { text: status ? status.replace(/_/g, ' ') : 'Aligned', className: 'text-slate-800' };
  };

  const gnssSignal = getGnssSignalDisplay();
  const gnssQual = getGnssQualityDisplay();
  const nhc = getNhcDisplay();
  const zupt = getZuptDisplay();
  const env = getEnvironmentDisplay();
  const alignment = getAlignmentDisplay();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop touch dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Drawer/Sheet Card */}
      <div
        className={clsx(
          'relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 z-10 transition-transform animate-in slide-in-from-bottom-6 duration-300 p-4.5 sm:p-5 select-none flex flex-col gap-4'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
            aria-label="Close navigation status"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors press-scale cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary State Banner */}
        <div className={clsx('p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-2', statusBgClass)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusIcon}
              <span className="font-bold text-sm tracking-tight">{statusTitle}</span>
            </div>
            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', statusBadgeClass)}>
              {statusBadge}
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
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-medium">Confidence</span>
              <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div className={clsx('mt-1 leading-tight', confidenceClass)}>
              {confidenceDisplay}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 truncate">
              {confidenceSubtext}
            </span>
          </div>

          {/* Estimated Accuracy */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-medium">Est. Accuracy</span>
              <Gauge className="w-4 h-4 text-brand-600" />
            </div>
            <div className={clsx('mt-1 leading-tight', accuracyClass)}>
              {accuracyDisplay}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 truncate">
              {accuracySubtext}
            </span>
          </div>
        </div>

        {/* Technical Telemetry Details */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-brand-600" />
            System Telemetry Breakdown
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* GNSS Availability */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">GNSS Signal</span>
              <span className={clsx('text-xs', gnssSignal.className)}>
                {gnssSignal.text}
              </span>
            </div>

            {/* GNSS Quality */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">GNSS Quality</span>
              <span className={clsx('text-xs', gnssQual.className)}>
                {gnssQual.text}
              </span>
            </div>

            {/* Non-Holonomic Constraint */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Motion Constraint (NHC)</span>
              <span className={clsx('text-xs', nhc.className)}>
                {nhc.text}
              </span>
            </div>

            {/* Stationary Hold (ZUPT) */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Stationary Hold (ZUPT)</span>
              <span className={clsx('text-xs', zupt.className)}>
                {zupt.text}
              </span>
            </div>

            {/* Environment */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Environment</span>
              <span className={clsx('text-xs truncate max-w-[130px]', env.className)} title={env.text}>
                {env.text}
              </span>
            </div>

            {/* Filter Alignment */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60">
              <span className="text-slate-500">Filter Alignment</span>
              <span className={clsx('text-xs', alignment.className)}>
                {alignment.text}
              </span>
            </div>
          </div>

          {/* Fused Coordinates (Only when real coordinates exist) */}
          {hasTelemetry && fusedPosition && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Position: {fusedPosition.latitude.toFixed(6)}, {fusedPosition.longitude.toFixed(6)}</span>
              <span>Speed: {(fusedPosition.speed * 3.6).toFixed(1)} km/h</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-1">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors press-scale cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

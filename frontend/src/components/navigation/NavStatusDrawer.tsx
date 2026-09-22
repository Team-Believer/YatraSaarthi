import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Navigation,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface NavStatusDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const NavStatusDrawer: React.FC<NavStatusDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const storeIsOpen = useNavigationStore((s) => s.isNavStatusDrawerOpen);
  const closeStoreDrawer = useNavigationStore((s) => s.closeNavStatusDrawer);

  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const state = useNavigationStore((s) => s.state);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);
  const locPermission = useLocationStore((s) => s.permission);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const handleClose = useCallback(() => {
    if (propOnClose) {
      propOnClose();
    } else {
      closeStoreDrawer();
    }
  }, [propOnClose, closeStoreDrawer]);

  // Handle Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // Format outage timer mm:ss
  const formatOutage = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // State flags (Preserved from Phase 6A)
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

  // Primary State Banner Derivation (Clean Factual Wording)
  let statusTitle = 'SYSTEM READY';
  let statusBadge = 'IDLE';
  let statusBadgeClass = 'bg-slate-200 text-slate-800';
  let statusBgClass = 'bg-slate-50 border-slate-200/90 text-slate-900';
  let statusIcon = <ShieldCheck className="w-5 h-5 text-brand-600" />;
  let statusDesc = 'Ready to start navigation';

  if (locPermission === 'denied') {
    statusTitle = 'LOCATION PERMISSION REQUIRED';
    statusBadge = 'PERMISSION';
    statusBadgeClass = 'bg-rose-100 text-rose-800 border border-rose-200';
    statusBgClass = 'bg-rose-50/90 border-rose-200 text-rose-950';
    statusIcon = <AlertTriangle className="w-5 h-5 text-rose-600" />;
    statusDesc = 'Browser location permission required';
  } else if (isStarting || (isLiveNav && !hasTelemetry)) {
    statusTitle = 'NAVIGATION INITIALIZING';
    statusBadge = 'STARTING';
    statusBadgeClass = 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse';
    statusBgClass = 'bg-blue-50/80 border-blue-200 text-blue-950';
    statusIcon = <Activity className="w-5 h-5 text-blue-600" />;
    statusDesc = 'Connecting to navigation telemetry';
  } else if (isRecovering) {
    statusTitle = 'GNSS RECOVERING';
    statusBadge = 'RECOVERING';
    statusBadgeClass = 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse';
    statusBgClass = 'bg-sky-50/80 border-sky-200 text-sky-950';
    statusIcon = <RotateCw className="w-5 h-5 text-sky-600 animate-spin" />;
    statusDesc = 'Validating GNSS recovery';
  } else if (isDrActive) {
    statusTitle = 'DEAD RECKONING ACTIVE';
    statusBadge = 'DEAD RECKONING';
    statusBadgeClass = 'bg-amber-100 text-amber-900 border border-amber-300 font-mono';
    statusBgClass = 'bg-amber-50/90 border-amber-200 text-amber-950';
    statusIcon = <Compass className="w-5 h-5 text-amber-600" />;
    statusDesc = 'Continuing navigation without GNSS';
  } else if (isDegraded) {
    statusTitle = 'GNSS DEGRADED';
    statusBadge = 'DEGRADED';
    statusBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-200';
    statusBgClass = 'bg-amber-50/80 border-amber-200 text-amber-950';
    statusIcon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
    statusDesc = 'GNSS signal degraded · Inertial aiding active';
  } else if (isLiveNav && hasTelemetry) {
    statusTitle = 'GNSS-AIDED NAVIGATION';
    statusBadge = 'LIVE';
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    statusBgClass = 'bg-emerald-50/80 border-emerald-200 text-emerald-950';
    statusIcon = <Satellite className="w-5 h-5 text-emerald-600" />;
    statusDesc = 'Navigation is receiving live GNSS data';
  }

  // Confidence & Accuracy Formatting
  let confidenceDisplay = 'Standby';
  let confidenceSubtext = 'Available during navigation';
  let confidenceClass = 'text-slate-500 font-semibold text-xl';

  if (isStandby) {
    confidenceDisplay = 'Standby';
    confidenceSubtext = 'Available during navigation';
    confidenceClass = 'text-slate-500 font-semibold text-xl';
  } else if (isStarting || !hasTelemetry) {
    confidenceDisplay = 'Estimating...';
    confidenceSubtext = 'Waiting for telemetry';
    confidenceClass = 'text-blue-600 font-semibold text-xl';
  } else if (hasTelemetry && typeof state.position_confidence === 'number' && state.position_confidence > 0) {
    const pct = Math.round(state.position_confidence * 100);
    confidenceDisplay = `${pct}%`;
    confidenceClass = 'text-slate-900 font-bold font-mono text-2xl';
    confidenceSubtext = pct >= 80 ? 'High position fidelity' : pct >= 50 ? 'Moderate estimation' : 'Inertial estimation';
  } else {
    confidenceDisplay = 'Estimating...';
    confidenceSubtext = 'Inertial position filter active';
    confidenceClass = 'text-slate-700 font-semibold text-xl';
  }

  let accuracyDisplay = 'Standby';
  let accuracySubtext = 'Available during navigation';
  let accuracyClass = 'text-slate-500 font-semibold text-xl';

  if (isStandby) {
    accuracyDisplay = 'Standby';
    accuracySubtext = 'Available during navigation';
    accuracyClass = 'text-slate-500 font-semibold text-xl';
  } else if (isStarting || !hasTelemetry) {
    accuracyDisplay = 'Estimating...';
    accuracySubtext = 'Validating error bounds';
    accuracyClass = 'text-blue-600 font-semibold text-xl';
  } else if (hasTelemetry && typeof state.horizontal_accuracy === 'number' && state.horizontal_accuracy > 0) {
    accuracyDisplay = `±${state.horizontal_accuracy.toFixed(1)} m`;
    accuracyClass = 'text-slate-900 font-bold font-mono text-2xl';
    accuracySubtext = 'Horizontal error bounds';
  } else {
    accuracyDisplay = 'Validating...';
    accuracySubtext = 'Estimating position bounds';
    accuracyClass = 'text-slate-700 font-semibold text-xl';
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
    if (isRecovering) return { text: 'Recovering', className: 'text-sky-600 font-semibold' };
    if (isDrActive) return { text: 'Unavailable', className: 'text-amber-600 font-semibold' };
    if (isDegraded) return { text: 'Degraded', className: 'text-amber-600 font-semibold' };
    if (gnssAvailable) return { text: 'Available', className: 'text-emerald-600 font-semibold' };
    return { text: 'Standby', className: 'text-slate-500' };
  };

  // GNSS Quality State Helper
  const getGnssQualityDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-slate-500' };
    if (!hasTelemetry) return { text: 'Detecting...', className: 'text-blue-600' };
    if (isDrActive) return { text: 'Lost', className: 'text-amber-600 font-semibold' };
    if (gnssQuality && gnssQuality !== 'UNKNOWN') {
      if (gnssQuality === 'EXCELLENT' || gnssQuality === 'GOOD') {
        return { text: gnssQuality, className: 'text-emerald-600 font-semibold' };
      }
      if (gnssQuality === 'FAIR' || gnssQuality === 'POOR') {
        return { text: gnssQuality, className: 'text-amber-600 font-semibold' };
      }
      return { text: gnssQuality, className: 'text-slate-800 font-semibold' };
    }
    return { text: 'Standby', className: 'text-slate-500' };
  };

  // NHC & ZUPT State Helpers
  const getNhcDisplay = () => {
    if (isStandby || !hasTelemetry) return { text: 'Standby', className: 'text-slate-500' };
    return state.nhc_active
      ? { text: 'Active', className: 'text-emerald-600 font-semibold' }
      : { text: 'Inactive', className: 'text-slate-400' };
  };

  const getZuptDisplay = () => {
    if (isStandby || !hasTelemetry) return { text: 'Standby', className: 'text-slate-500' };
    return state.zupt_active
      ? { text: 'Engaged', className: 'text-emerald-600 font-semibold' }
      : { text: 'Inactive', className: 'text-slate-400' };
  };

  // Filter Alignment Helper
  const getAlignmentDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-slate-500' };
    if (!hasTelemetry) return { text: 'Aligning...', className: 'text-blue-600' };
    const status = state.alignment_status;
    if (status === 'ALIGNED') return { text: 'Aligned', className: 'text-emerald-600 font-semibold' };
    if (status === 'ALIGNING') return { text: 'Aligning...', className: 'text-blue-600' };
    if (status === 'UNALIGNED') return { text: 'Unaligned', className: 'text-amber-600 font-semibold' };
    return { text: status ? status.replace(/_/g, ' ') : 'Aligned', className: 'text-slate-800 font-semibold' };
  };

  const gnssSignal = getGnssSignalDisplay();
  const gnssQual = getGnssQualityDisplay();
  const nhc = getNhcDisplay();
  const zupt = getZuptDisplay();
  const env = getEnvironmentDisplay();
  const alignment = getAlignmentDisplay();

  const telemetryRows = [
    { label: 'GNSS Signal', ...gnssSignal },
    { label: 'GNSS Quality', ...gnssQual },
    { label: 'Motion Constraint (NHC)', ...nhc },
    { label: 'Stationary Hold (ZUPT)', ...zupt },
    { label: 'Environment', ...env },
    { label: 'Filter Alignment', ...alignment },
  ];

  // Render directly into document.body as a true viewport-level overlay
  const drawerContent = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Single Full-Screen Backdrop Touch Dismiss */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Main Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-status-drawer-title"
        className={clsx(
          'relative w-full sm:max-w-lg max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 z-10 flex flex-col overflow-hidden transition-all animate-in slide-in-from-bottom-4 duration-200'
        )}
      >
        {/* 1. Header (Fixed at top of modal, never clipped or scrolled away) */}
        <div className="shrink-0 p-5 sm:p-6 pb-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
              <Navigation className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="nav-status-drawer-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Navigation Status
              </h2>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                Real-time navigation telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close navigation status"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-4 space-y-4 select-none">
          {/* Current State Banner */}
          <div className={clsx('p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-1.5 transition-colors duration-200', statusBgClass)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcon}
                <span className="font-bold text-xs sm:text-sm tracking-tight">{statusTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                {outageDuration > 0 && isDrActive && (
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md border border-amber-300">
                    {formatOutage(outageDuration)}
                  </span>
                )}
                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider', statusBadgeClass)}>
                  {statusBadge}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">{statusDesc}</p>
          </div>

          {/* Key Metrics: Confidence & Estimated Accuracy */}
          <div className="grid grid-cols-2 gap-3">
            {/* Confidence */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex flex-col justify-between min-h-[90px]">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Confidence</span>
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <div className={clsx('mt-1 leading-none', confidenceClass)}>
                {confidenceDisplay}
              </div>
              <span className="text-[10.5px] text-slate-400 mt-1 truncate">
                {confidenceSubtext}
              </span>
            </div>

            {/* Estimated Accuracy */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex flex-col justify-between min-h-[90px]">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Estimated Accuracy</span>
                <Gauge className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <div className={clsx('mt-1 leading-none', accuracyClass)}>
                {accuracyDisplay}
              </div>
              <span className="text-[10.5px] text-slate-400 mt-1 truncate">
                {accuracySubtext}
              </span>
            </div>
          </div>

          {/* Telemetry Breakdown Rows */}
          <div className="space-y-1 pt-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-0.5 mb-1.5">
              System Telemetry
            </div>

            <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
              {telemetryRows.map((row) => (
                <div key={row.label} className="py-2.5 px-0.5 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{row.label}</span>
                  <span className={clsx('text-xs truncate max-w-[150px]', row.className)} title={row.text}>
                    {row.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Fused Coordinates (Only when real coordinates exist) */}
            {hasTelemetry && fusedPosition && (
              <div className="pt-2 px-0.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Pos: {fusedPosition.latitude.toFixed(5)}, {fusedPosition.longitude.toFixed(5)}</span>
                <span>Speed: {(fusedPosition.speed * 3.6).toFixed(1)} km/h</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};

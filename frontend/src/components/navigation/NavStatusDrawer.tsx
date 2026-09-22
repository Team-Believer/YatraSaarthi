import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import {
  X,
  ShieldCheck,
  Target,
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

  // Primary State Derivation (Clean Factual Wording with Small Semantic Dot)
  let statusTitle = 'Navigation ready';
  let statusBadge = 'IDLE';
  let statusBadgeClass = 'bg-canvas-soft text-ink-body border-border-clean';
  let statusDotColor = 'bg-emerald-500';
  let statusDesc = 'Ready to start navigation';

  if (locPermission === 'denied') {
    statusTitle = 'Location permission required';
    statusBadge = 'PERMISSION';
    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
    statusDotColor = 'bg-rose-500';
    statusDesc = 'Browser location permission required to locate vehicle';
  } else if (isStarting || (isLiveNav && !hasTelemetry)) {
    statusTitle = 'Navigation initializing';
    statusBadge = 'STARTING';
    statusBadgeClass = 'bg-canvas-soft text-ink border-border-clean';
    statusDotColor = 'bg-sky-500 animate-pulse';
    statusDesc = 'Connecting to navigation telemetry stream';
  } else if (isRecovering) {
    statusTitle = 'GNSS recovering';
    statusBadge = 'RECOVERING';
    statusBadgeClass = 'bg-cyan-50 text-cyan-800 border-cyan-200';
    statusDotColor = 'bg-cyan-500 animate-pulse';
    statusDesc = 'Validating satellite fix stability';
  } else if (isDrActive) {
    statusTitle = 'Dead reckoning active';
    statusBadge = 'DEAD RECKONING';
    statusBadgeClass = 'bg-amber-50 text-amber-900 border-amber-200';
    statusDotColor = 'bg-amber-500';
    statusDesc = 'Continuing navigation using InEKF motion model without GNSS';
  } else if (isDegraded) {
    statusTitle = 'GNSS degraded';
    statusBadge = 'DEGRADED';
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
    statusDotColor = 'bg-amber-500';
    statusDesc = 'GNSS signal degraded · Inertial aiding active';
  } else if (isLiveNav && hasTelemetry) {
    statusTitle = 'GNSS-aided navigation';
    statusBadge = 'LIVE';
    statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    statusDotColor = 'bg-emerald-500';
    statusDesc = 'Navigation is receiving verified satellite fixes';
  }

  // Confidence & Accuracy Formatting
  let confidenceDisplay = 'Standby';
  let confidenceSubtext = 'Available during navigation';
  let confidenceClass = 'text-ink-body font-semibold text-xl';

  if (isStandby) {
    confidenceDisplay = 'Standby';
    confidenceSubtext = 'Available during navigation';
    confidenceClass = 'text-ink-body font-semibold text-xl';
  } else if (isStarting || !hasTelemetry) {
    confidenceDisplay = 'Estimating...';
    confidenceSubtext = 'Waiting for telemetry';
    confidenceClass = 'text-ink font-semibold text-xl';
  } else if (hasTelemetry && typeof state.position_confidence === 'number' && state.position_confidence > 0) {
    const pct = Math.round(state.position_confidence * 100);
    confidenceDisplay = `${pct}%`;
    confidenceClass = 'text-ink font-bold font-mono text-2xl';
    confidenceSubtext = pct >= 80 ? 'High position fidelity' : pct >= 50 ? 'Moderate estimation' : 'Inertial estimation';
  } else {
    confidenceDisplay = 'Estimating...';
    confidenceSubtext = 'Inertial filter active';
    confidenceClass = 'text-ink font-semibold text-xl';
  }

  let accuracyDisplay = 'Standby';
  let accuracySubtext = 'Available during navigation';
  let accuracyClass = 'text-ink-body font-semibold text-xl';

  if (isStandby) {
    accuracyDisplay = 'Standby';
    accuracySubtext = 'Available during navigation';
    accuracyClass = 'text-ink-body font-semibold text-xl';
  } else if (isStarting || !hasTelemetry) {
    accuracyDisplay = 'Estimating...';
    accuracySubtext = 'Validating error bounds';
    accuracyClass = 'text-ink font-semibold text-xl';
  } else if (hasTelemetry && typeof state.horizontal_accuracy === 'number' && state.horizontal_accuracy > 0) {
    accuracyDisplay = `±${state.horizontal_accuracy.toFixed(1)} m`;
    accuracyClass = 'text-ink font-bold font-mono text-2xl';
    accuracySubtext = 'Horizontal error bounds';
  } else {
    accuracyDisplay = 'Validating...';
    accuracySubtext = 'Estimating position bounds';
    accuracyClass = 'text-ink font-semibold text-xl';
  }

  // Environment Display Helper
  const getEnvironmentDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-ink-body' };
    if (!hasTelemetry) return { text: 'Detecting...', className: 'text-ink' };

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
          ? { text: env.replace(/_/g, ' '), className: 'text-ink font-medium' }
          : { text: 'Detecting...', className: 'text-ink-body' };
    }
  };

  // GNSS Signal State Helper
  const getGnssSignalDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-ink-body' };
    if (!hasTelemetry) return { text: 'Waiting...', className: 'text-ink' };
    if (isRecovering) return { text: 'Recovering', className: 'text-cyan-600 font-semibold' };
    if (isDrActive) return { text: 'Unavailable', className: 'text-amber-600 font-semibold' };
    if (isDegraded) return { text: 'Degraded', className: 'text-amber-600 font-semibold' };
    if (gnssAvailable) return { text: 'Available', className: 'text-emerald-600 font-semibold' };
    return { text: 'Standby', className: 'text-ink-body' };
  };

  // GNSS Quality State Helper
  const getGnssQualityDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-ink-body' };
    if (!hasTelemetry) return { text: 'Detecting...', className: 'text-ink' };
    if (isDrActive) return { text: 'Lost', className: 'text-amber-600 font-semibold' };
    if (gnssQuality && gnssQuality !== 'UNKNOWN') {
      if (gnssQuality === 'EXCELLENT' || gnssQuality === 'GOOD') {
        return { text: gnssQuality, className: 'text-emerald-600 font-semibold' };
      }
      if (gnssQuality === 'FAIR' || gnssQuality === 'POOR') {
        return { text: gnssQuality, className: 'text-amber-600 font-semibold' };
      }
      return { text: gnssQuality, className: 'text-ink font-semibold' };
    }
    return { text: 'Standby', className: 'text-ink-body' };
  };

  // NHC & ZUPT State Helpers
  const getNhcDisplay = () => {
    if (isStandby || !hasTelemetry) return { text: 'Standby', className: 'text-ink-body' };
    return state.nhc_active
      ? { text: 'Active', className: 'text-emerald-600 font-semibold' }
      : { text: 'Inactive', className: 'text-ink-mute' };
  };

  const getZuptDisplay = () => {
    if (isStandby || !hasTelemetry) return { text: 'Standby', className: 'text-ink-body' };
    return state.zupt_active
      ? { text: 'Engaged', className: 'text-emerald-600 font-semibold' }
      : { text: 'Inactive', className: 'text-ink-mute' };
  };

  // Filter Alignment Helper
  const getAlignmentDisplay = () => {
    if (isStandby) return { text: 'Standby', className: 'text-ink-body' };
    if (!hasTelemetry) return { text: 'Aligning...', className: 'text-ink' };
    const status = state.alignment_status;
    if (status === 'ALIGNED') return { text: 'Aligned', className: 'text-emerald-600 font-semibold' };
    if (status === 'ALIGNING') return { text: 'Aligning...', className: 'text-ink-body' };
    if (status === 'UNALIGNED') return { text: 'Unaligned', className: 'text-amber-600 font-semibold' };
    return { text: status ? status.replace(/_/g, ' ') : 'Aligned', className: 'text-ink font-medium' };
  };

  const gnssSignal = getGnssSignalDisplay();
  const gnssQual = getGnssQualityDisplay();
  const nhc = getNhcDisplay();
  const zupt = getZuptDisplay();
  const env = getEnvironmentDisplay();
  const alignment = getAlignmentDisplay();

  const telemetryRows = [
    { label: 'GNSS signal', ...gnssSignal },
    { label: 'GNSS quality', ...gnssQual },
    { label: 'Motion constraint (NHC)', ...nhc },
    { label: 'Stationary hold (ZUPT)', ...zupt },
    { label: 'Environment', ...env },
    { label: 'Filter alignment', ...alignment },
  ];

  // Render directly into document.body as a true viewport-level overlay
  const drawerContent = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop Touch Dismiss */}
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
          'relative w-full sm:max-w-xl max-h-[90vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-nav-modal border border-border-clean z-10 flex flex-col overflow-hidden transition-all animate-in slide-in-from-bottom-4 duration-200'
        )}
      >
        {/* 1. Header (Fixed at top of modal) */}
        <div className="shrink-0 p-5 sm:p-6 pb-4 border-b border-border-clean flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-border-clean text-ink flex items-center justify-center shrink-0 shadow-2xs">
              <Navigation className="w-4.5 h-4.5 text-ink" />
            </div>
            <div>
              <h2 id="nav-status-drawer-title" className="text-base sm:text-lg font-bold text-ink leading-tight">
                Navigation status
              </h2>
              <p className="text-xs text-ink-body leading-none mt-0.5">
                Real-time navigation telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close navigation status"
            className="w-9 h-9 rounded-full bg-white hover:bg-canvas-soft border border-border-clean text-ink transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 select-none hide-scrollbar">
          {/* Current State Card */}
          <div className="p-4 bg-white rounded-2xl border border-border-clean flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={clsx('w-2.5 h-2.5 rounded-full shrink-0', statusDotColor)} />
                <span className="font-semibold text-sm text-ink tracking-tight">{statusTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                {outageDuration > 0 && isDrActive && (
                  <span className="font-mono text-xs font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    {formatOutage(outageDuration)}
                  </span>
                )}
                <span className={clsx('text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wider border', statusBadgeClass)}>
                  {statusBadge}
                </span>
              </div>
            </div>
            <p className="text-xs text-ink-body leading-relaxed font-normal">{statusDesc}</p>
          </div>

          {/* Key Metrics: Confidence & Estimated Accuracy */}
          <div className="grid grid-cols-2 gap-3">
            {/* Confidence Card */}
            <div className="p-4 bg-white rounded-2xl border border-border-clean flex flex-col justify-between min-h-[96px] shadow-2xs">
              <div className="flex items-center justify-between text-ink-body text-xs font-medium">
                <span>Confidence</span>
                <ShieldCheck className="w-4 h-4 text-ink-mute" />
              </div>
              <div className={clsx('mt-1 leading-none', confidenceClass)}>
                {confidenceDisplay}
              </div>
              <span className="text-[11px] text-ink-mute mt-1 truncate">
                {confidenceSubtext}
              </span>
            </div>

            {/* Estimated Accuracy Card */}
            <div className="p-4 bg-white rounded-2xl border border-border-clean flex flex-col justify-between min-h-[96px] shadow-2xs">
              <div className="flex items-center justify-between text-ink-body text-xs font-medium">
                <span>Estimated accuracy</span>
                <Target className="w-4 h-4 text-ink-mute" />
              </div>
              <div className={clsx('mt-1 leading-none', accuracyClass)}>
                {accuracyDisplay}
              </div>
              <span className="text-[11px] text-ink-mute mt-1 truncate">
                {accuracySubtext}
              </span>
            </div>
          </div>

          {/* Telemetry Breakdown Rows */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-ink-mute uppercase tracking-wider px-0.5 mb-2">
              System telemetry
            </div>

            <div className="border-t border-border-clean divide-y divide-border-clean">
              {telemetryRows.map((row) => (
                <div key={row.label} className="py-3 px-0.5 flex items-center justify-between text-xs">
                  <span className="text-ink-body font-normal">{row.label}</span>
                  <span className={clsx('text-xs truncate max-w-[160px]', row.className)} title={row.text}>
                    {row.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Fused Coordinates (Only when real coordinates exist) */}
            {hasTelemetry && fusedPosition && (
              <div className="pt-3 px-0.5 flex items-center justify-between text-[11px] font-mono text-ink-mute border-t border-border-clean">
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


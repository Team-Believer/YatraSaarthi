import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { ChevronRight } from 'lucide-react';

export interface NavStatusPillProps {
  className?: string;
  expanded?: boolean;
  showSecondary?: boolean;
  alwaysVisible?: boolean;
  showChevron?: boolean;
  showDrawerOnClick?: boolean;
  onClick?: () => void;
}

export type NavStateCategory =
  | 'GNSS_FIX'
  | 'GNSS_DEGRADED'
  | 'DEAD_RECKONING'
  | 'GNSS_RECOVERING'
  | 'STANDBY'
  | 'ACQUIRING'
  | 'PERMISSION_REQUIRED'
  | 'ERROR';

// Format outage time mm:ss
const formatOutageDuration = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const NavStatusPill: React.FC<NavStatusPillProps> = ({
  className,
  expanded = false,
  showSecondary = false,
  alwaysVisible = false,
  showChevron = false,
  showDrawerOnClick = false,
  onClick,
}) => {
  const openNavStatusDrawer = useNavigationStore((s) => s.openNavStatusDrawer);

  // Store Subscriptions
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);
  const gnssAvailable = useNavigationStore((s) => s.state.gnss_available);
  const gnssQuality = useNavigationStore((s) => s.state.gnss_quality);
  const outageDuration = useNavigationStore((s) => s.state.gnss_outage_duration);
  const envState = useNavigationStore((s) => s.state.environment_state);

  const websocketStatus = useNavigationStore((s) => s.websocketStatus);
  const errorMessage = useNavigationStore((s) => s.errorMessage);

  const locPermission = useLocationStore((s) => s.permission);
  const locAvailability = useLocationStore((s) => s.availability);

  const isStarting = sessionStatus === 'STARTING';
  const isEnding = sessionStatus === 'ENDING';
  const isLiveNav = isLive || sessionStatus === 'LIVE';

  // IDLE UX: Do not render status pill on the main map when idle unless explicitly requested (e.g. Diagnostics)
  if (!alwaysVisible && !isLiveNav && !isStarting && !isEnding) {
    return null;
  }

  // Derive precise category from real backend state
  let category: NavStateCategory = 'STANDBY';
  let title = 'Navigation ready';
  let secondary = 'Sensors standby';

  if (isLiveNav) {
    if (websocketStatus === 'ERROR' || websocketStatus === 'CLOSED') {
      category = 'ERROR';
      title = 'Connection lost';
      secondary = errorMessage || 'Telemetry disconnected';
    } else {
      const modeUpper = (navMode || '').toUpperCase();

      if (modeUpper.includes('REACQUISITION') || modeUpper.includes('RECOVERY')) {
        category = 'GNSS_RECOVERING';
        title = 'GNSS recovering';
        secondary = 'Validating satellite fix';
      } else if (
        modeUpper.includes('DEAD_RECKONING') ||
        modeUpper.includes('LOST') ||
        modeUpper.includes('INEKF') ||
        modeUpper.includes('INERTIAL') ||
        !gnssAvailable ||
        envState === 'TUNNEL'
      ) {
        category = 'DEAD_RECKONING';
        title = 'Dead reckoning';
        secondary =
          typeof outageDuration === 'number' && outageDuration > 0
            ? `GNSS unavailable · ${formatOutageDuration(outageDuration)}`
            : 'Inertial dead reckoning';
      } else if (modeUpper.includes('DEGRADING') || gnssQuality === 'POOR' || gnssQuality === 'FAIR') {
        category = 'GNSS_DEGRADED';
        title = 'GNSS degraded';
        secondary = 'Signal quality reduced';
      } else if (gnssAvailable || modeUpper.includes('AIDED')) {
        category = 'GNSS_FIX';
        title = 'GNSS signal';
        secondary = 'Satellite lock active';
      } else {
        category = 'GNSS_DEGRADED';
        title = 'GNSS degraded';
        secondary = 'Inertial aiding active';
      }
    }
  } else if (isStarting) {
    category = 'ACQUIRING';
    title = 'Starting navigation...';
    secondary = 'Connecting to system';
  } else if (isEnding) {
    category = 'STANDBY';
    title = 'Finalizing...';
    secondary = 'Saving trip summary';
  } else if (locPermission === 'denied') {
    category = 'PERMISSION_REQUIRED';
    title = 'Location required';
    secondary = 'Enable geolocation';
  } else if (locAvailability === 'getting') {
    category = 'ACQUIRING';
    title = 'Acquiring GNSS...';
    secondary = 'Searching for satellites';
  } else if (locAvailability === 'available') {
    category = 'STANDBY';
    title = 'Navigation ready';
    secondary = 'Sensors calibrated';
  }

  // Visual styling: White base pill with small semantic indicator dot
  let dotColor = 'bg-emerald-500';
  let dotPulse = false;

  switch (category) {
    case 'GNSS_FIX':
      dotColor = 'bg-emerald-500';
      dotPulse = true;
      break;

    case 'DEAD_RECKONING':
      dotColor = 'bg-amber-500';
      dotPulse = true;
      break;

    case 'GNSS_RECOVERING':
      dotColor = 'bg-cyan-500';
      dotPulse = true;
      break;

    case 'GNSS_DEGRADED':
      dotColor = 'bg-amber-500';
      dotPulse = false;
      break;

    case 'ACQUIRING':
      dotColor = 'bg-sky-500';
      dotPulse = true;
      break;

    case 'PERMISSION_REQUIRED':
      dotColor = 'bg-rose-500';
      dotPulse = false;
      break;

    case 'ERROR':
      dotColor = 'bg-rose-500';
      dotPulse = true;
      break;

    case 'STANDBY':
    default:
      dotColor = 'bg-emerald-500';
      dotPulse = false;
      break;
  }

  const isClickable = Boolean(onClick || showDrawerOnClick);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (showDrawerOnClick) {
      openNavStatusDrawer();
    }
  };

  const content = (
    <>
      {/* Small semantic dot */}
      <div className="flex items-center justify-center relative shrink-0">
        <span
          className={clsx(
            'w-2 h-2 rounded-full shrink-0',
            dotColor,
            dotPulse && 'animate-pulse'
          )}
        />
      </div>

      {/* Title & optional secondary */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-ink leading-tight truncate">
          {title}
        </span>
        {(expanded || showSecondary) && secondary && (
          <span className="text-[10px] text-ink-body font-normal leading-tight truncate">
            {secondary}
          </span>
        )}
      </div>

      {/* Optional subtle chevron in diagnostics mode */}
      {showChevron && (
        <ChevronRight className="w-3.5 h-3.5 text-ink-mute group-hover:text-ink group-hover:translate-x-0.5 transition-all ml-0.5 shrink-0" />
      )}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Navigation status: ${title}`}
        title={`Navigation status: ${title}`}
        className={twMerge(
          clsx(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-ink border border-border-clean shadow-nav-pill select-none cursor-pointer transition-all duration-150 hover:bg-canvas-softer active:scale-[0.97] group text-left',
            className
          )
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-label={`Navigation status: ${title}`}
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-ink border border-border-clean shadow-nav-pill select-none text-left',
          className
        )
      )}
    >
      {content}
    </div>
  );
};

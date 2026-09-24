import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useDemoOutage } from '../../hooks/useDemoOutage';
import { deriveGnssNavStatus, formatOutageDuration } from '../../utils/navigation/gnssStatus';
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
  const navState = useNavigationStore((s) => s.state);
  const navMode = navState.navigation_mode;
  const gnssAvailable = navState.gnss_available;
  const gnssQuality = navState.gnss_quality;
  const outageDuration = navState.gnss_outage_duration;
  const envState = navState.environment_state;
  const imuAvailable = navState.imu_available;

  const engineSource = navState.engine_source;
  const websocketStatus = useNavigationStore((s) => s.websocketStatus);

  const locPermission = useLocationStore((s) => s.permission);
  const locAvailability = useLocationStore((s) => s.availability);

  const { isSimulating: isDemoOutageActive, outageSeconds: demoOutageSeconds } = useDemoOutage();

  const isStarting = sessionStatus === 'STARTING';
  const isEnding = sessionStatus === 'ENDING';
  const isLiveNav = isLive || sessionStatus === 'LIVE';

  // IDLE UX: Do not render status pill on the main map when idle unless explicitly requested (e.g. Diagnostics)
  if (!alwaysVisible && !isLiveNav && !isStarting && !isEnding) {
    return null;
  }

  // Derive title, secondary text, and indicator styling
  let title = 'GPS · Strong';
  let secondary: string | null = 'Satellite lock active';
  let dotColor = 'bg-emerald-500';
  let dotPulse = false;

  if (isLiveNav) {
    if (websocketStatus === 'ERROR' || websocketStatus === 'CLOSED' || engineSource === 'UNAVAILABLE') {
      title = 'Connection lost';
      secondary = 'Local sensor logging active';
      dotColor = 'bg-rose-500';
      dotPulse = true;
    } else {
      const derived = deriveGnssNavStatus({
        isLive: true,
        navigationMode: navMode,
        gnssAvailable,
        gnssQuality,
        gnssOutageDuration: outageDuration,
        environmentState: envState,
        imuAvailable,
        isDemoOutageActive,
        demoOutageSeconds,
      });

      title = derived.title;
      dotColor = derived.dotColor;

      if (derived.isDr) {
        dotPulse = true;
        const outSec = derived.outageDurationSeconds;
        secondary = outSec > 0 ? `${formatOutageDuration(outSec)} outage` : 'IMU + AI active';
      } else if (derived.isReacquiring) {
        dotPulse = true;
        secondary = 'Validating satellite fix';
      } else if (derived.state === 'DEGRADED') {
        dotPulse = false;
        secondary = 'Inertial aiding active';
      } else if (derived.state === 'GNSS_FUSING') {
        dotPulse = false;
        secondary = 'Nominal sensor fusion';
      } else {
        dotPulse = false;
        secondary = 'Satellite lock active';
      }
    }
  } else if (isStarting) {
    title = 'Starting navigation...';
    secondary = 'Connecting to system';
    dotColor = 'bg-sky-500';
    dotPulse = true;
  } else if (isEnding) {
    title = 'Finalizing...';
    secondary = 'Saving trip summary';
    dotColor = 'bg-emerald-500';
    dotPulse = false;
  } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
    title = 'Offline mode';
    secondary = 'Saved routes available';
    dotColor = 'bg-slate-400';
    dotPulse = false;
  } else if (locPermission === 'denied') {
    title = 'Location permission required';
    secondary = 'Enable geolocation in settings';
    dotColor = 'bg-rose-500';
    dotPulse = false;
  } else if (locPermission === 'prompt') {
    title = 'GPS · Waiting for permission';
    secondary = 'Grant location permission';
    dotColor = 'bg-sky-500';
    dotPulse = true;
  } else if (locAvailability === 'getting') {
    title = 'GPS · Acquiring';
    secondary = 'Searching for satellites';
    dotColor = 'bg-sky-500';
    dotPulse = true;
  } else {
    title = 'Navigation ready';
    secondary = 'Sensors calibrated';
    dotColor = 'bg-emerald-500';
    dotPulse = false;
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
            'w-2 h-2 rounded-full shrink-0 transition-colors duration-200',
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
        title={`Navigation status: ${title} - click for telemetry details`}
        className={twMerge(
          clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-ink border border-border-clean shadow-nav-pill select-none cursor-pointer transition-all duration-150 hover:bg-canvas-softer active:scale-[0.97] group text-left',
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

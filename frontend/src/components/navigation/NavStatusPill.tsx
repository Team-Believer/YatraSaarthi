import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import {
  Satellite,
  Compass,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Lock,
  Radio,
  ChevronRight,
} from 'lucide-react';

export interface NavStatusPillProps {
  className?: string;
  expanded?: boolean;
  showSecondary?: boolean;
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

  const locPermission = useLocationStore((s) => s.permission);
  const locAvailability = useLocationStore((s) => s.availability);

  // Derive precise category from real backend state
  let category: NavStateCategory = 'STANDBY';
  let title = 'SYSTEM READY';
  let secondary = 'Hardware sensors standby';

  if (isLive || sessionStatus === 'LIVE') {
    const modeUpper = (navMode || '').toUpperCase();

    if (modeUpper.includes('REACQUISITION') || modeUpper.includes('RECOVERY')) {
      category = 'GNSS_RECOVERING';
      title = 'GNSS RECOVERING';
      secondary = 'Validating satellite position';
    } else if (
      modeUpper.includes('DEAD_RECKONING') ||
      modeUpper.includes('LOST') ||
      modeUpper.includes('INEKF') ||
      modeUpper.includes('INERTIAL') ||
      !gnssAvailable ||
      envState === 'TUNNEL'
    ) {
      category = 'DEAD_RECKONING';
      title = 'DEAD RECKONING ACTIVE';
      secondary =
        typeof outageDuration === 'number' && outageDuration > 0
          ? `GNSS unavailable · ${formatOutageDuration(outageDuration)}`
          : 'Continuing with inertial navigation';
    } else if (modeUpper.includes('DEGRADING') || gnssQuality === 'POOR' || gnssQuality === 'FAIR') {
      category = 'GNSS_DEGRADED';
      title = 'GNSS DEGRADED';
      secondary = 'Signal quality reduced';
    } else if (gnssAvailable || modeUpper.includes('AIDED')) {
      category = 'GNSS_FIX';
      title = 'GNSS SIGNAL';
      secondary = 'Multi-constellation lock';
    } else {
      category = 'GNSS_DEGRADED';
      title = 'GNSS DEGRADED';
      secondary = 'Inertial aiding active';
    }
  } else if (sessionStatus === 'STARTING') {
    category = 'ACQUIRING';
    title = 'STARTING SESSION...';
    secondary = 'Establishing real-time link';
  } else if (sessionStatus === 'ENDING') {
    category = 'STANDBY';
    title = 'FINALIZING...';
    secondary = 'Persisting trip summary';
  } else if (locPermission === 'denied') {
    category = 'PERMISSION_REQUIRED';
    title = 'LOCATION PERMISSION REQUIRED';
    secondary = 'Enable browser geolocation';
  } else if (locAvailability === 'getting') {
    category = 'ACQUIRING';
    title = 'ACQUIRING GNSS FIX...';
    secondary = 'Searching for satellite signals';
  } else if (locAvailability === 'available') {
    category = 'STANDBY';
    title = 'READY TO NAVIGATE';
    secondary = 'Hardware sensors calibrated';
  }

  // Visual styling variants
  let containerStyle = '';
  let badgeStyle = '';
  let iconElement: React.ReactNode = null;

  switch (category) {
    case 'GNSS_FIX':
      containerStyle = 'bg-emerald-50/95 text-emerald-950 border-emerald-300/80 shadow-emerald-500/10 hover:bg-emerald-100/90';
      badgeStyle = 'bg-emerald-500 text-white animate-gnss-pulse';
      iconElement = <Satellite className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      break;

    case 'DEAD_RECKONING':
      containerStyle = 'bg-amber-50/95 text-amber-950 border-amber-300/90 shadow-amber-500/15 hover:bg-amber-100/90';
      badgeStyle = 'bg-amber-500 text-white animate-dr-pulse';
      iconElement = <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      break;

    case 'GNSS_RECOVERING':
      containerStyle = 'bg-sky-50/95 text-sky-950 border-sky-300/80 shadow-sky-500/10 hover:bg-sky-100/90';
      badgeStyle = 'bg-sky-500 text-white animate-pulse';
      iconElement = <RotateCw className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />;
      break;

    case 'GNSS_DEGRADED':
      containerStyle = 'bg-amber-50/95 text-amber-900 border-amber-200/90 hover:bg-amber-100/90';
      badgeStyle = 'bg-amber-500 text-white';
      iconElement = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      break;

    case 'ACQUIRING':
      containerStyle = 'bg-blue-50/95 text-blue-900 border-blue-200/90 hover:bg-blue-100/90';
      badgeStyle = 'bg-blue-500 text-white animate-pulse';
      iconElement = <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />;
      break;

    case 'PERMISSION_REQUIRED':
      containerStyle = 'bg-rose-50/95 text-rose-900 border-rose-300 hover:bg-rose-100/90';
      badgeStyle = 'bg-rose-500 text-white';
      iconElement = <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      break;

    case 'STANDBY':
    default:
      containerStyle = 'bg-white/95 text-slate-800 border-slate-200/90 shadow-nav-pill hover:bg-slate-50';
      badgeStyle = 'bg-slate-600 text-white';
      iconElement = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      break;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openNavStatusDrawer();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Click to view real-time navigation telemetry and status"
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md select-none cursor-pointer transition-all duration-200 press-scale group text-left',
          containerStyle,
          className
        )
      )}
    >
      {/* Pulsing Dot */}
      <div className="flex items-center justify-center relative shrink-0">
        <span className={clsx('w-2 h-2 rounded-full shrink-0', badgeStyle)} />
      </div>

      {/* Icon & Title */}
      <div className="flex items-center gap-1.5 min-w-0">
        {iconElement}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold tracking-tight uppercase leading-tight truncate">
            {title}
          </span>
          {(expanded || showSecondary) && secondary && (
            <span className="text-[9.5px] font-normal opacity-80 leading-tight truncate">
              {secondary}
            </span>
          )}
        </div>
      </div>

      {/* Subtle Chevron indicator on hover */}
      <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-0.5 shrink-0" />
    </button>
  );
};

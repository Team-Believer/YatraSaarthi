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
} from 'lucide-react';

export interface NavStatusPillProps {
  className?: string;
  expanded?: boolean;
  showSecondary?: boolean;
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

export const NavStatusPill: React.FC<NavStatusPillProps> = ({
  className,
  expanded = false,
  showSecondary = false,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);
  const gnssAvailable = useNavigationStore((s) => s.state.gnss_available);
  const outageDuration = useNavigationStore((s) => s.state.gnss_outage_duration);
  const envState = useNavigationStore((s) => s.state.environment_state);

  const locPermission = useLocationStore((s) => s.permission);
  const locAvailability = useLocationStore((s) => s.availability);

  // Derive precise category from real backend state
  let category: NavStateCategory = 'STANDBY';
  let title = 'System Ready';
  let secondary = 'Sensors calibrated';

  if (isLive || sessionStatus === 'LIVE') {
    const modeUpper = (navMode || '').toUpperCase();
    const isDr =
      modeUpper.includes('DEAD_RECKONING') ||
      modeUpper.includes('INEKF') ||
      modeUpper.includes('INERTIAL') ||
      !gnssAvailable;

    if (envState === 'TUNNEL' || outageDuration > 0) {
      if (gnssAvailable && outageDuration > 0 && outageDuration < 5) {
        category = 'GNSS_RECOVERING';
        title = 'GNSS RECOVERING';
        secondary = 'Re-aligning satellite fix';
      } else {
        category = 'DEAD_RECKONING';
        title = 'DEAD RECKONING ACTIVE';
        secondary = outageDuration > 0 ? `Outage: ${outageDuration.toFixed(0)}s • InEKF active` : 'Inertial Dead Reckoning active';
      }
    } else if (isDr) {
      category = 'DEAD_RECKONING';
      title = 'DEAD RECKONING ACTIVE';
      secondary = 'InEKF Inertial Navigation';
    } else if (gnssAvailable) {
      category = 'GNSS_FIX';
      title = 'GPS SIGNAL';
      secondary = 'High precision 3D fix';
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
    title = 'PERMISSION REQUIRED';
    secondary = 'Allow browser geolocation';
  } else if (locAvailability === 'getting') {
    category = 'ACQUIRING';
    title = 'ACQUIRING FIX...';
    secondary = 'Searching for GNSS satellites';
  } else if (locAvailability === 'available') {
    category = 'STANDBY';
    title = 'READY TO NAVIGATE';
    secondary = 'Hardware sensors standby';
  }

  // Visual styling variants
  let containerStyle = '';
  let badgeStyle = '';
  let iconElement: React.ReactNode = null;

  switch (category) {
    case 'GNSS_FIX':
      containerStyle = 'bg-emerald-50/95 text-emerald-900 border-emerald-300/80 shadow-emerald-500/10';
      badgeStyle = 'bg-emerald-500 text-white animate-gnss-pulse';
      iconElement = <Satellite className="w-3.5 h-3.5 text-emerald-600" />;
      break;

    case 'DEAD_RECKONING':
      containerStyle = 'bg-amber-50/95 text-amber-950 border-amber-300/90 shadow-amber-500/15';
      badgeStyle = 'bg-amber-500 text-white animate-dr-pulse';
      iconElement = <Compass className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />;
      break;

    case 'GNSS_RECOVERING':
      containerStyle = 'bg-sky-50/95 text-sky-950 border-sky-300/80';
      badgeStyle = 'bg-sky-500 text-white';
      iconElement = <RotateCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />;
      break;

    case 'GNSS_DEGRADED':
      containerStyle = 'bg-amber-50/95 text-amber-900 border-amber-200';
      badgeStyle = 'bg-amber-500 text-white';
      iconElement = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      break;

    case 'ACQUIRING':
      containerStyle = 'bg-blue-50/95 text-blue-900 border-blue-200';
      badgeStyle = 'bg-blue-500 text-white animate-pulse';
      iconElement = <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />;
      break;

    case 'PERMISSION_REQUIRED':
      containerStyle = 'bg-rose-50/95 text-rose-900 border-rose-300';
      badgeStyle = 'bg-rose-500 text-white';
      iconElement = <Lock className="w-3.5 h-3.5 text-rose-600" />;
      break;

    case 'STANDBY':
    default:
      containerStyle = 'bg-white/95 text-slate-800 border-slate-200/90 shadow-nav-pill';
      badgeStyle = 'bg-emerald-500 text-white';
      iconElement = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      break;
  }

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border backdrop-blur-md select-none transition-all duration-200',
          containerStyle,
          className
        )
      )}
    >
      <div className="flex items-center justify-center relative">
        <span className={clsx('w-2 h-2 rounded-full shrink-0', badgeStyle)} />
      </div>

      <div className="flex items-center gap-1.5">
        {iconElement}
        <div className="flex flex-col">
          <span className="text-[11px] font-bold tracking-tight uppercase leading-tight">
            {title}
          </span>
          {(expanded || showSecondary) && secondary && (
            <span className="text-[9.5px] font-normal opacity-75 leading-tight">
              {secondary}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

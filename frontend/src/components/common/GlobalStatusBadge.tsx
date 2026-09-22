import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useSensorStore } from '../../stores/useSensorStore';
import { useLocationStore } from '../../stores/useLocationStore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GlobalStatusBadgeProps {
  status?: string;
  className?: string;
}

export const GlobalStatusBadge: React.FC<GlobalStatusBadgeProps> = ({ status, className }) => {
  const { state, sessionStatus } = useNavigationStore();
  const { capabilities } = useSensorStore();
  const { permission: locPermission, availability: locAvailability } = useLocationStore();

  let activeStatus = status;

  if (!activeStatus) {
    if (sessionStatus === 'LIVE' || state.session_id) {
      activeStatus = state.gnss_available ? 'LIVE' : 'DEGRADED';
    } else if (sessionStatus === 'ENDING') {
      activeStatus = 'ENDING';
    } else if (sessionStatus === 'STARTING') {
      activeStatus = 'STARTING';
    } else if (locPermission === 'denied') {
      activeStatus = 'PERMISSION_REQUIRED';
    } else if (locAvailability === 'available') {
      activeStatus = 'STANDBY';
    } else if (locAvailability === 'getting') {
      activeStatus = 'GETTING';
    } else if (capabilities.geolocation) {
      activeStatus = 'STANDBY';
    } else {
      activeStatus = 'UNAVAILABLE';
    }
  }

  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';
  let label = activeStatus;

  switch (activeStatus) {
    case 'LIVE':
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      dotClass = 'bg-emerald-500';
      label = 'LIVE NAVIGATION';
      break;
    case 'DEGRADED':
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200/80';
      dotClass = 'bg-amber-500';
      label = 'INEKF DEAD RECKONING';
      break;
    case 'STARTING':
      colorClass = 'bg-blue-50 text-blue-800 border-blue-200/80';
      dotClass = 'bg-blue-500 animate-pulse';
      label = 'CONNECTING...';
      break;
    case 'ENDING':
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200/80';
      dotClass = 'bg-amber-500 animate-pulse';
      label = 'FINALIZING...';
      break;
    case 'STANDBY':
      colorClass = 'bg-slate-100/90 text-slate-700 border-slate-200/80';
      dotClass = 'bg-emerald-500';
      label = 'SYSTEM READY';
      break;
    case 'GETTING':
      colorClass = 'bg-sky-50 text-sky-800 border-sky-200/80';
      dotClass = 'bg-sky-500 animate-pulse';
      label = 'ACQUIRING FIX...';
      break;
    case 'UNAVAILABLE':
      colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
      dotClass = 'bg-slate-400';
      label = 'Sensors Unavailable';
      break;
    case 'PERMISSION_REQUIRED':
      colorClass = 'bg-rose-50 text-rose-800 border-rose-200/80';
      dotClass = 'bg-rose-500';
      label = 'Permission Required';
      break;
    case 'ERROR':
      colorClass = 'bg-red-50 text-red-800 border-red-200/80';
      dotClass = 'bg-red-500';
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-tight rounded-full border shadow-2xs select-none',
        colorClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
      {label}
    </span>
  );
};

export default GlobalStatusBadge;


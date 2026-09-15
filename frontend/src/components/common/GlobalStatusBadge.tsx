import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useSensorStore } from '../../stores/useSensorStore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GlobalStatusBadgeProps {
  status?: string;
  className?: string;
}

export const GlobalStatusBadge: React.FC<GlobalStatusBadgeProps> = ({ status, className }) => {
  const { state } = useNavigationStore();
  const { capabilities, permissions } = useSensorStore();

  let activeStatus = status;

  if (!activeStatus) {
    if (state.session_id) {
      activeStatus = state.gnss_available ? 'LIVE' : 'DEGRADED';
    } else if (capabilities.geolocation) {
      activeStatus = permissions.geolocation === 'DENIED' ? 'PERMISSION_REQUIRED' : 'STANDBY';
    } else {
      activeStatus = 'UNAVAILABLE';
    }
  }

  let colorClass = 'bg-gray-100 text-gray-800';
  let label = activeStatus;

  switch (activeStatus) {
    case 'LIVE':
      colorClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      label = '● LIVE NAVIGATION';
      break;
    case 'DEGRADED':
      colorClass = 'bg-amber-100 text-amber-800 border border-amber-200';
      label = '▲ INEKF DEAD RECKONING';
      break;
    case 'STANDBY':
      colorClass = 'bg-blue-100 text-blue-800 border border-blue-200';
      label = 'SYSTEM READY';
      break;
    case 'UNAVAILABLE':
      colorClass = 'bg-gray-100 text-gray-600 border border-gray-200';
      label = 'Sensors Unavailable';
      break;
    case 'PERMISSION_REQUIRED':
      colorClass = 'bg-rose-100 text-rose-800 border border-rose-200';
      label = 'Permission Required';
      break;
    case 'ERROR':
      colorClass = 'bg-red-100 text-red-800 border border-red-200';
      break;
  }

  return (
    <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', colorClass, className)}>
      {label}
    </span>
  );
};

export default GlobalStatusBadge;


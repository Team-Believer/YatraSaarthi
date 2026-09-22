import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Navigation,
  Map,
  Clock,
  BrainCircuit,
  Settings,
  Activity,
  Radio,
  User,
  X,
  Bookmark,
  ChevronRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigationStore } from '../../stores/useNavigationStore';

interface NavGroup {
  label: string;
  items: {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: string;
    isPrimary?: boolean;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'NAVIGATION',
    items: [
      { name: 'Navigate', path: '/app', icon: Navigation, isPrimary: true },
      { name: 'Map', path: '/app/map', icon: Map },
      { name: 'GNSS Outage Test', path: '/app/tunnel', icon: Radio },
    ],
  },
  {
    label: 'ACTIVITY',
    items: [
      { name: 'Trips', path: '/app/history', icon: Clock },
      { name: 'Saved Routes', path: '/app/memory', icon: Bookmark },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { name: 'Navigation Intelligence', path: '/app/learning', icon: BrainCircuit },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { name: 'Diagnostics', path: '/app/diagnostics', icon: Activity },
      { name: 'Settings', path: '/app/settings', icon: Settings },
      { name: 'Profile', path: '/app/profile', icon: User },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
  isDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isDrawer = false }) => {
  const location = useLocation();

  // Real store state
  const isLive = useNavigationStore((s) => s.isLive);
  const navMode = useNavigationStore((s) => s.state.navigation_mode);
  const gnssAvailable = useNavigationStore((s) => s.state.gnss_available);

  const isItemActive = (itemPath: string) => {
    if (itemPath === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  // Derive navigation-oriented system status
  const isDrActive = isLive && (!gnssAvailable || navMode.includes('DEAD_RECKONING') || navMode.includes('LOST'));
  const isRecovering = isLive && (navMode.includes('REACQUISITION') || navMode.includes('RECOVERY'));

  const getStatusTitle = () => {
    if (isDrActive) return 'Dead Reckoning Active';
    if (isRecovering) return 'GNSS Recovering';
    if (isLive) return 'Navigation Active';
    return 'Navigation Ready';
  };

  const getStatusSubtitle = () => {
    if (isDrActive) return 'Inertial dead reckoning active';
    if (isRecovering) return 'Reacquiring satellite fix';
    if (isLive) return 'Navigation in progress';
    return 'Ready to navigate';
  };

  return (
    <aside className="w-[88vw] max-w-[320px] sm:w-[320px] bg-white/95 backdrop-blur-xl border-r border-slate-200/90 flex flex-col h-full select-none shrink-0 shadow-2xl z-50 overflow-hidden">
      {/* 1. Header: Brand Logo & Title */}
      <div className="h-15 px-4.5 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white/80">
        <Link
          to="/app"
          onClick={onClose}
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-95 focus:outline-none"
        >
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
            <Compass className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight group-hover:text-brand-700 transition-colors">
              YatraSaarthi
            </span>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-brand-600 leading-none mt-0.5">
              INTELLIGENT NAVIGATION
            </span>
          </div>
        </Link>

        {isDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* 2. Navigation Status Card */}
      <div className="px-3.5 pt-3 pb-1 shrink-0">
        <Link
          to="/app/diagnostics"
          onClick={onClose}
          className="p-2.5 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center justify-between transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={clsx(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isDrActive
                    ? 'bg-amber-400'
                    : isRecovering
                    ? 'bg-sky-400'
                    : isLive
                    ? 'bg-emerald-400'
                    : 'bg-emerald-400'
                )}
              />
              <span
                className={clsx(
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  isDrActive
                    ? 'bg-amber-500'
                    : isRecovering
                    ? 'bg-sky-500'
                    : isLive
                    ? 'bg-emerald-500'
                    : 'bg-emerald-500'
                )}
              />
            </span>

            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold text-slate-800 leading-tight truncate">
                {getStatusTitle()}
              </span>
              <span className="text-[10px] text-slate-500 font-normal leading-tight truncate mt-0.5">
                {getStatusSubtitle()}
              </span>
            </div>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </Link>
      </div>

      {/* 3. Grouped Navigation Items */}
      <nav className="flex-1 py-2 px-3 space-y-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {/* Group Label */}
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
              {group.label}
            </div>

            {/* Group Nav Items */}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={clsx(
                    'group relative flex items-center justify-between px-3 h-10 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer',
                    isActive
                      ? item.isPrimary
                        ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/20'
                        : 'bg-brand-50/90 text-brand-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Active Accent Indicator for secondary items */}
                    {isActive && !item.isPrimary && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-600 rounded-r-full"
                        aria-hidden="true"
                      />
                    )}

                    <Icon
                      className={clsx(
                        'w-4 h-4 shrink-0 transition-colors duration-150',
                        isActive
                          ? item.isPrimary
                            ? 'text-white'
                            : 'text-brand-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />

                    <span className="truncate">{item.name}</span>
                  </div>

                  {/* Badge or subtle hover chevron */}
                  {item.badge ? (
                    <span
                      className={clsx(
                        'text-[10px] font-bold px-1.5 py-0.2 rounded-md',
                        isActive && item.isPrimary
                          ? 'bg-white/20 text-white'
                          : 'bg-brand-100 text-brand-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={clsx(
                        'w-3 h-3 transition-all shrink-0',
                        isActive
                          ? item.isPrimary
                            ? 'text-white/80'
                            : 'text-brand-600 opacity-80'
                          : 'text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                      )}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 4. Bottom Engine Status Footer */}
      <div className="p-3 mx-3 mb-3 shrink-0 rounded-2xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">
              Navigation Engine
            </span>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 leading-tight shrink-0">
            {isLive ? 'ACTIVE' : 'READY'}
          </span>
        </div>
        <p className="text-[10px] leading-tight text-slate-500 mt-1">
          {isLive
            ? 'Dead reckoning engine active for GNSS-denied navigation.'
            : 'Dead reckoning engine ready.'}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;

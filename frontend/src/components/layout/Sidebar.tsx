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
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';

interface NavGroup {
  label: string;
  items: {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'NAVIGATION',
    items: [
      { name: 'Navigate', path: '/app', icon: Navigation },
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
    if (isDrActive) return 'Dead reckoning active';
    if (isRecovering) return 'GNSS recovering';
    if (isLive) return 'Navigation active';
    return 'Navigation ready';
  };

  const getStatusSubtitle = () => {
    if (isDrActive) return 'Inertial dead reckoning';
    if (isRecovering) return 'Reacquiring satellite fix';
    if (isLive) return 'Navigation in progress';
    return 'Ready to navigate';
  };

  return (
    <aside className="w-[88vw] max-w-[300px] sm:w-[300px] bg-white border-r border-border-clean flex flex-col h-full select-none shrink-0 shadow-nav-floating z-50 overflow-hidden">
      {/* 1. Header: Official Brand Logo */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border-clean shrink-0 bg-white">
        <Link
          to="/app"
          onClick={onClose}
          className="flex items-center group transition-opacity hover:opacity-90 focus:outline-none"
          title="YatraSaarthi"
        >
          <YatraSaarthiLogo variant="compact" height={42} />
        </Link>

        {isDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-2 rounded-full text-ink-body hover:text-ink hover:bg-canvas-soft transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* 2. Compact System Status Card */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <Link
          to="/app/diagnostics"
          onClick={onClose}
          className="p-3 bg-white hover:bg-canvas-softer rounded-2xl border border-border-clean flex items-center justify-between transition-colors group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={clsx(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isDrActive
                    ? 'bg-amber-400'
                    : isRecovering
                    ? 'bg-cyan-400'
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
                    ? 'bg-cyan-500'
                    : isLive
                    ? 'bg-emerald-500'
                    : 'bg-emerald-500'
                )}
              />
            </span>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-ink leading-tight truncate">
                {getStatusTitle()}
              </span>
              <span className="text-[11px] text-ink-body font-normal leading-tight truncate mt-0.5">
                {getStatusSubtitle()}
              </span>
            </div>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-ink-mute group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </Link>
      </div>

      {/* 3. Grouped Navigation Items */}
      <nav className="flex-1 py-2 px-3 space-y-3 overflow-y-auto hide-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {/* Group Label */}
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-mute select-none">
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
                      ? 'bg-canvas-soft text-ink font-semibold'
                      : 'text-ink-body hover:bg-canvas-softer hover:text-ink'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Active Vertical Bar Indicator */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4.5 bg-ink rounded-r-full"
                        aria-hidden="true"
                      />
                    )}

                    <Icon
                      className={clsx(
                        'w-4 h-4 shrink-0 transition-colors duration-150',
                        isActive ? 'text-ink' : 'text-ink-mute group-hover:text-ink'
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />

                    <span className="truncate">{item.name}</span>
                  </div>

                  {/* Badge or subtle hover chevron */}
                  {item.badge ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ink text-white">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={clsx(
                        'w-3.5 h-3.5 transition-all shrink-0',
                        isActive
                          ? 'text-ink opacity-80'
                          : 'text-ink-mute opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
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
      <div className="p-3 mx-3 mb-3 shrink-0 rounded-2xl bg-canvas-soft border border-border-clean">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-ink shrink-0" />
            <span className="text-xs font-semibold text-ink tracking-tight truncate">
              Navigation engine
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-ink border border-border-clean leading-tight shrink-0 shadow-2xs">
            {isLive ? 'Active' : 'Ready'}
          </span>
        </div>
        <p className="text-[11px] leading-tight text-ink-body mt-1.5">
          {isLive
            ? 'Dead reckoning engine active for GNSS-denied navigation.'
            : 'Dead reckoning engine ready.'}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;

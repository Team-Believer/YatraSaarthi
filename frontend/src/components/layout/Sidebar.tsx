import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Navigation,
  Satellite,
  History,
  Bookmark,
  BrainCircuit,
  Activity,
  Settings,
  UserRound,
  X,
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
      { name: 'GNSS Outage Test', path: '/app/tunnel', icon: Satellite },
    ],
  },
  {
    label: 'ACTIVITY',
    items: [
      { name: 'Trips', path: '/app/history', icon: History },
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
      { name: 'Profile', path: '/app/profile', icon: UserRound },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
  isDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isDrawer = false }) => {
  const location = useLocation();

  // Store state for bottom engine status
  const isLive = useNavigationStore((s) => s.isLive);

  const isItemActive = (itemPath: string) => {
    if (itemPath === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/map';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  return (
    <aside className="w-[88vw] max-w-[300px] sm:w-[300px] bg-white border-r border-border-clean flex flex-col h-full select-none shrink-0 shadow-nav-floating z-50 overflow-hidden">
      {/* 1. Header: Official Brand Logo */}
      <div className="h-20 px-4 flex items-center justify-between border-b border-border-clean shrink-0 bg-white">
        <Link
          to="/app"
          onClick={onClose}
          className="flex items-center group transition-opacity hover:opacity-90 focus:outline-none py-1 min-w-0"
          title="YatraSaarthi"
        >
          <YatraSaarthiLogo variant="compact" height={52} />
        </Link>

        {isDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-2 rounded-full text-ink-body hover:text-ink hover:bg-canvas-soft transition-colors cursor-pointer shrink-0 ml-1"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* 2. Grouped Navigation Items */}
      <nav className="flex-1 py-3 px-3 space-y-5 overflow-y-auto hide-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {/* Group Label */}
            <div className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-mute select-none">
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
                    'group flex items-center justify-between px-3.5 h-11 rounded-xl text-[14px] transition-colors duration-150 ease-out cursor-pointer',
                    isActive
                      ? 'bg-[#F3F3F3] text-ink font-medium'
                      : 'text-ink-body hover:bg-[#F7F7F7] hover:text-ink font-normal'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={clsx(
                        'w-5 h-5 shrink-0 transition-colors duration-150',
                        isActive ? 'text-ink' : 'text-[#9CA3AF] group-hover:text-ink-body'
                      )}
                      strokeWidth={isActive ? 2 : 1.75}
                    />

                    <span className="truncate">{item.name}</span>
                  </div>

                  {/* Badge or stationary chevron */}
                  {item.badge ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ink text-white">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={clsx(
                        'w-4 h-4 shrink-0 transition-colors duration-150',
                        isActive ? 'text-[#111111] opacity-100' : 'text-[#D1D5DB] group-hover:text-[#9CA3AF]'
                      )}
                      strokeWidth={1.75}
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

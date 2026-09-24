import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Navigation2,
  History,
  Bookmark,
  BrainCircuit,
  Activity,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';

interface NavItemConfig {
  name: string;
  tooltip: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    name: 'Home',
    tooltip: 'Home',
    path: '/app',
    icon: LayoutGrid,
  },
  {
    name: 'Navigate',
    tooltip: 'Navigate',
    path: '/app/map',
    icon: (props) => <Navigation2 {...props} className={clsx(props.className, 'rotate-45')} />,
  },
  {
    name: 'Trips',
    tooltip: 'Trips',
    path: '/app/history',
    icon: History,
  },
  {
    name: 'Saved',
    tooltip: 'Saved',
    path: '/app/memory',
    icon: Bookmark,
  },
];

const ENGINEERING_NAV_ITEMS: NavItemConfig[] = [
  {
    name: 'Navigation Intelligence',
    tooltip: 'Navigation Intelligence',
    path: '/app/learning',
    icon: BrainCircuit,
  },
  {
    name: 'Diagnostics',
    tooltip: 'Diagnostics',
    path: '/app/diagnostics',
    icon: Activity,
  },
];

const UTILITY_NAV_ITEMS: NavItemConfig[] = [
  {
    name: 'Settings',
    tooltip: 'Settings',
    path: '/app/settings',
    icon: Settings,
  },
  {
    name: 'Profile',
    tooltip: 'Profile',
    path: '/app/profile',
    icon: UserRound,
  },
];

interface SidebarProps {
  onClose?: () => void;
  isDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isDrawer = false }) => {
  const location = useLocation();
  const isLive = useNavigationStore((s) => s.isLive);

  const isItemActive = (itemPath: string) => {
    if (itemPath === '/app') {
      return location.pathname === '/app';
    }
    if (itemPath === '/app/map') {
      return location.pathname === '/app/map' || location.pathname === '/app/tunnel';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  // =========================================================================
  // MOBILE OFF-CANVAS NAVIGATION DRAWER (Secondary / Utility only)
  // Home, Navigate, Trips, Saved are handled by the bottom nav bar.
  // This drawer contains only: Navigation Intelligence, Diagnostics, Settings, Profile.
  // =========================================================================
  if (isDrawer) {
    return (
      <aside
        aria-label="Navigation Drawer"
        className="w-[260px] bg-white border-r border-[#F0F2F2] flex flex-col h-full select-none shrink-0 shadow-nav-floating z-50 overflow-hidden font-body rounded-tr-2xl rounded-br-2xl"
      >
        {/* 1. Compact Brand Header */}
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-[#F0F2F2] shrink-0 bg-white">
          <Link
            to="/app"
            onClick={onClose}
            className="flex items-center group py-0.5 min-w-0"
            title="YatraSaarthi"
            aria-label="YatraSaarthi Home"
          >
            <YatraSaarthiLogo variant="header" height={24} showText={true} />
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              title="Close navigation menu"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#083335] hover:bg-[#F0F4F4] active:bg-[#E2EBEB] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4.5 h-4.5 stroke-[2]" />
            </button>
          )}
        </div>

        {/* 2. Navigation Content — secondary destinations only */}
        <nav className="flex-1 py-3 px-2.5 space-y-4 overflow-y-auto hide-scrollbar">
          {/* NAVIGATION Group (Engineering tools) */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8CA5A6] select-none font-heading">
              Navigation
            </div>
            {ENGINEERING_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  aria-label={item.name}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'group flex items-center px-3 h-11 rounded-xl text-[13.5px] transition-all duration-150 ease-out cursor-pointer select-none',
                    isActive
                      ? 'bg-[#083335] text-white font-medium shadow-2xs'
                      : 'text-slate-800 hover:bg-[#F0F4F4] font-normal hover:text-[#083335]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={clsx(
                        'w-4.5 h-4.5 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                      )}
                      strokeWidth={2}
                    />
                    <span className="truncate leading-tight font-medium font-body">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* SYSTEM Group */}
          <div className="space-y-0.5">
            <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8CA5A6] select-none font-heading">
              System
            </div>
            {UTILITY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  aria-label={item.name}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'group flex items-center px-3 h-11 rounded-xl text-[13.5px] transition-all duration-150 ease-out cursor-pointer select-none',
                    isActive
                      ? 'bg-[#083335] text-white font-medium shadow-2xs'
                      : 'text-slate-800 hover:bg-[#F0F4F4] font-normal hover:text-[#083335]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={clsx(
                        'w-4.5 h-4.5 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                      )}
                      strokeWidth={2}
                    />
                    <span className="truncate leading-tight font-medium font-body">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 3. Compact Navigation Engine Status */}
        <div className="px-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 shrink-0 bg-white border-t border-[#F0F2F2]">
          <div className="px-2.5 py-2 rounded-xl bg-[#F0F4F4] border border-[#E2EBEB] font-body select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    isLive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-600'
                  )}
                />
                <span className="text-[11px] font-semibold text-[#083335] truncate font-heading">
                  {isLive ? 'Navigation active' : 'Navigation ready'}
                </span>
              </div>
              <span
                className={clsx(
                  'text-[9px] font-bold px-1.5 py-px rounded-full border leading-tight shrink-0',
                  isLive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-[#083335] border-border-clean shadow-2xs'
                )}
              >
                {isLive ? 'LIVE' : 'READY'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // DESKTOP FLOATING NAVIGATION CONTROL RAIL (Premium Mobility Aesthetic)
  // =========================================================================
  return (
    <aside
      aria-label="Primary Navigation"
      className="hidden md:flex flex-col items-center w-[74px] h-fit bg-white/[0.96] rounded-[26px] border border-slate-200/80 shadow-[0_8px_24px_rgba(8,51,53,0.08)] py-3 px-2 select-none shrink-0 z-40 transition-all duration-200 gap-2.5 font-sans"
    >
      {/* 1. TOP: Compact Logo Mark (<44px) */}
      <div className="flex flex-col items-center shrink-0 w-full">
        <Link
          to="/app"
          className="w-[42px] h-[42px] rounded-[14px] bg-[#F0F4F4] hover:bg-[#E2EBEB] border border-border-clean flex items-center justify-center transition-all group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]"
          title="YatraSaarthi"
          aria-label="YatraSaarthi Home"
        >
          <YatraSaarthiLogo variant="icon" height={24} />
          {/* Flyout Tooltip */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#083335] text-white text-xs font-medium rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 font-sans">
            YatraSaarthi
          </div>
        </Link>
      </div>

      {/* 2. PRIMARY NAVIGATION GROUP (Home, Navigate, Trips, Saved) */}
      <nav aria-label="Core navigation" className="flex flex-col items-center gap-2 w-full">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]',
                isActive
                  ? 'bg-[#083335] text-white shadow-xs'
                  : 'text-[#4A6364] hover:text-[#083335] hover:bg-[#083335]/[0.06] active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                )}
                strokeWidth={1.8}
              />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#083335] text-white text-xs font-medium rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 font-sans">
                {item.tooltip}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 3. ENGINEERING GROUP (Intelligence, Diagnostics) */}
      <nav aria-label="Engineering navigation" className="flex flex-col items-center gap-2 w-full pt-1">
        {ENGINEERING_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]',
                isActive
                  ? 'bg-[#083335] text-white shadow-xs'
                  : 'text-[#4A6364] hover:text-[#083335] hover:bg-[#083335]/[0.06] active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                )}
                strokeWidth={1.8}
              />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#083335] text-white text-xs font-medium rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 font-sans">
                {item.tooltip}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 4. SINGLE SUBTLE DIVIDER */}
      <div className="w-8 h-px bg-slate-200/80 my-0.5" />

      {/* 5. UTILITY GROUP (Settings, Profile) */}
      <nav aria-label="Utility navigation" className="flex flex-col items-center gap-2 shrink-0 w-full">
        {UTILITY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'w-[44px] h-[44px] rounded-[14px] flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]',
                isActive
                  ? 'bg-[#083335] text-white shadow-xs'
                  : 'text-[#4A6364] hover:text-[#083335] hover:bg-[#083335]/[0.06] active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                )}
                strokeWidth={1.8}
              />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#083335] text-white text-xs font-medium rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 font-sans">
                {item.tooltip}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

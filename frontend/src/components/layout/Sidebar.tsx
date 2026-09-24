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

const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    name: 'Dashboard',
    tooltip: 'Overview',
    path: '/app',
    icon: LayoutGrid,
  },
  {
    name: 'Navigation',
    tooltip: 'Live navigation',
    path: '/app/map',
    icon: (props) => <Navigation2 {...props} className={clsx(props.className, 'rotate-45')} />,
  },
  {
    name: 'Trips',
    tooltip: 'Trip history',
    path: '/app/history',
    icon: History,
  },
  {
    name: 'Saved Routes',
    tooltip: 'Saved routes',
    path: '/app/memory',
    icon: Bookmark,
  },
  {
    name: 'Navigation Intelligence',
    tooltip: 'Navigation intelligence',
    path: '/app/learning',
    icon: BrainCircuit,
  },
  {
    name: 'Diagnostics',
    tooltip: 'System diagnostics',
    path: '/app/diagnostics',
    icon: Activity,
  },
];

const BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  {
    name: 'Settings',
    tooltip: 'App settings',
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
      return location.pathname === '/app/map';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  // MOBILE OFF-CANVAS NAVIGATION DRAWER
  if (isDrawer) {
    return (
      <aside
        aria-label="Navigation Drawer"
        className="w-[82vw] max-w-[340px] bg-white border-r border-[#F0F2F2] flex flex-col h-full select-none shrink-0 shadow-nav-floating z-50 overflow-hidden font-body"
      >
        {/* 1. Compact Brand Header (< 64px) */}
        <div className="h-15 px-3.5 flex items-center justify-between border-b border-[#F0F2F2] shrink-0 bg-white">
          <Link
            to="/app"
            onClick={onClose}
            className="flex items-center group py-0.5 min-w-0"
            title="YatraSaarthi"
            aria-label="YatraSaarthi Home"
          >
            <YatraSaarthiLogo variant="header" height={28} showText={true} />
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              title="Close navigation menu"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#083335] hover:bg-[#F0F4F4] active:bg-[#E2EBEB] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          )}
        </div>

        {/* 2. Navigation Content Area */}
        <nav className="flex-1 py-3 px-3 space-y-3 overflow-y-auto hide-scrollbar">
          {/* NAVIGATION Group */}
          <div className="space-y-1">
            <div className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8CA5A6] select-none font-heading">
              Navigation
            </div>
            {MAIN_NAV_ITEMS.map((item) => {
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
                    'group flex items-center px-3 h-11.5 sm:h-12 rounded-xl text-[14px] transition-all duration-150 ease-out cursor-pointer select-none',
                    isActive
                      ? 'bg-[#083335] text-white font-medium shadow-2xs'
                      : 'text-slate-800 hover:bg-[#F0F4F4] font-normal hover:text-[#083335]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
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
          <div className="space-y-1 pt-2">
            <div className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8CA5A6] select-none font-heading">
              System
            </div>
            {BOTTOM_NAV_ITEMS.map((item) => {
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
                    'group flex items-center px-3 h-11.5 sm:h-12 rounded-xl text-[14px] transition-all duration-150 ease-out cursor-pointer select-none',
                    isActive
                      ? 'bg-[#083335] text-white font-medium shadow-2xs'
                      : 'text-slate-800 hover:bg-[#F0F4F4] font-normal hover:text-[#083335]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
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

        {/* 3. Compact Navigation Engine Status Surface (52-58px, respects safe area) */}
        <div className="p-3 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))] bg-white">
          <div className="p-2.5 rounded-xl bg-[#F0F4F4] border border-[#E2EBEB] font-body select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full shrink-0',
                    isLive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-600'
                  )}
                />
                <span className="text-xs font-semibold text-[#083335] truncate font-heading">
                  {isLive ? 'Navigation active' : 'Navigation ready'}
                </span>
              </div>
              <span
                className={clsx(
                  'text-[9.5px] font-bold px-2 py-0.5 rounded-full border leading-tight shrink-0',
                  isLive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-[#083335] border-border-clean shadow-2xs'
                )}
              >
                {isLive ? 'LIVE' : 'READY'}
              </span>
            </div>
            <p className="text-[10.5px] leading-tight text-[#4A6364] mt-0.5 pl-4 truncate">
              {isLive
                ? 'InEKF dead reckoning tracking'
                : 'InEKF ready'}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // DESKTOP NARROW VERTICAL FLOATING RAIL (Matching Reference UI Pattern with Evergreen Active State)
  return (
    <aside
      aria-label="Primary Navigation"
      className="hidden md:flex flex-col items-center w-[70px] lg:w-[72px] h-fit bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgba(8,51,53,0.08)] py-3 px-2 select-none shrink-0 z-40 transition-all duration-200 gap-2.5"
    >
      {/* 1. TOP: YatraSaarthi Brand Logo */}
      <div className="flex flex-col items-center gap-2 shrink-0 w-full">
        <Link
          to="/app"
          className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-[#F0F4F4] hover:bg-[#E2EBEB] border border-border-clean flex items-center justify-center transition-all group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]"
          title="YatraSaarthi"
          aria-label="YatraSaarthi Home"
        >
          <YatraSaarthiLogo variant="icon" height={28} />
          {/* Flyout Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-white border border-border-clean text-ink text-xs font-semibold rounded-xl shadow-lg shadow-black/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0">
            YatraSaarthi
          </div>
        </Link>
        <div className="w-8 h-px bg-border-clean" />
      </div>

      {/* 2. MAIN: Navigation Stack */}
      <nav className="flex flex-col items-center gap-1.5 w-full">
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]',
                isActive
                  ? 'bg-[#083335] text-white shadow-xs'
                  : 'text-[#4A6364] hover:text-[#083335] hover:bg-[#F0F4F4] active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                )}
                strokeWidth={2}
              />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-3.5 py-1.5 bg-white border border-border-clean text-ink text-xs font-semibold rounded-xl shadow-lg shadow-black/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 flex items-center gap-1.5">
                <span>{item.tooltip}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 3. BOTTOM: Settings & Profile Stack */}
      <div className="flex flex-col items-center gap-1.5 shrink-0 w-full">
        <div className="w-8 h-px bg-border-clean my-0.5" />
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#083335]',
                isActive
                  ? 'bg-[#083335] text-white shadow-xs'
                  : 'text-[#4A6364] hover:text-[#083335] hover:bg-[#F0F4F4] active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-[#4A6364] group-hover:text-[#083335]'
                )}
                strokeWidth={2}
              />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-3.5 py-1.5 bg-white border border-border-clean text-ink text-xs font-semibold rounded-xl shadow-lg shadow-black/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 flex items-center gap-1.5">
                <span>{item.tooltip}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;

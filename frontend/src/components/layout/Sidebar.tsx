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
  ChevronRight,
  ShieldCheck,
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
    icon: Navigation2,
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
    name: 'AI Insights',
    tooltip: 'Motion intelligence',
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

  // MOBILE OFF-CANVAS DRAWER MODE (When opened via hamburger button on phones)
  if (isDrawer) {
    return (
      <aside className="w-[88vw] max-w-[320px] bg-white border-r border-border-clean flex flex-col h-full select-none shrink-0 shadow-nav-floating z-50 overflow-hidden">
        {/* Drawer Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-border-clean shrink-0 bg-white">
          <Link
            to="/app"
            onClick={onClose}
            className="flex items-center group transition-opacity hover:opacity-90 focus:outline-none py-1 min-w-0"
            title="YatraSaarthi"
          >
            <YatraSaarthiLogo variant="compact" height={48} />
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation drawer"
              className="p-2 rounded-full text-ink-body hover:text-ink hover:bg-canvas-soft transition-colors cursor-pointer shrink-0 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3.5 space-y-6 overflow-y-auto hide-scrollbar">
          {/* Main Nav */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-mute select-none">
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
                    'group flex items-center justify-between px-3.5 h-12 rounded-2xl text-[14px] transition-all duration-150 ease-out cursor-pointer',
                    isActive
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'text-ink hover:bg-slate-100 font-normal'
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon
                      className={clsx(
                        'w-5 h-5 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-ink'
                      )}
                      strokeWidth={2}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">{item.name}</span>
                      <span
                        className={clsx(
                          'text-[11px] truncate leading-tight mt-0.5',
                          isActive ? 'text-slate-300' : 'text-slate-400'
                        )}
                      >
                        {item.tooltip}
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    className={clsx(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-white/80' : 'text-slate-300 group-hover:text-slate-500'
                    )}
                  />
                </Link>
              );
            })}
          </div>

          {/* System Nav */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-mute select-none">
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
                    'group flex items-center justify-between px-3.5 h-12 rounded-2xl text-[14px] transition-all duration-150 ease-out cursor-pointer',
                    isActive
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'text-ink hover:bg-slate-100 font-normal'
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon
                      className={clsx(
                        'w-5 h-5 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-ink'
                      )}
                      strokeWidth={2}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">{item.name}</span>
                      <span
                        className={clsx(
                          'text-[11px] truncate leading-tight mt-0.5',
                          isActive ? 'text-slate-300' : 'text-slate-400'
                        )}
                      >
                        {item.tooltip}
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    className={clsx(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-white/80' : 'text-slate-300 group-hover:text-slate-500'
                    )}
                  />
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Engine Status Footer */}
        <div className="p-3.5 m-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-900 shrink-0" />
              <span className="text-xs font-semibold text-slate-900 truncate">
                Navigation Engine
              </span>
            </div>
            <span
              className={clsx(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border leading-tight shrink-0 shadow-2xs',
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-700 border-slate-200'
              )}
            >
              {isLive ? 'LIVE' : 'READY'}
            </span>
          </div>
          <p className="text-[11px] leading-tight text-slate-500 mt-1.5">
            {isLive
              ? 'Dead reckoning active for GNSS-denied guidance.'
              : 'InEKF ready for vehicle navigation.'}
          </p>
        </div>
      </aside>
    );
  }

  // DESKTOP NARROW VERTICAL FLOATING RAIL (Matching Reference UI Pattern)
  return (
    <aside
      aria-label="Primary Navigation"
      className="hidden md:flex flex-col items-center w-[70px] lg:w-[72px] h-fit bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-3 px-2 select-none shrink-0 z-40 transition-all duration-200 gap-2.5"
    >
      {/* 1. TOP: YatraSaarthi Brand Logo */}
      <div className="flex flex-col items-center gap-2 shrink-0 w-full">
        <Link
          to="/app"
          className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-center transition-all group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          title="YatraSaarthi"
          aria-label="YatraSaarthi Home"
        >
          <YatraSaarthiLogo variant="icon" height={28} />
          {/* Flyout Tooltip (White card, subtle border, soft shadow) */}
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0">
            YatraSaarthi
          </div>
        </Link>
        <div className="w-8 h-px bg-slate-200/80" />
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
                'w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                )}
                strokeWidth={2}
              />

              {/* Flyout Tooltip (White card, subtle border, soft shadow, delay 150ms) */}
              <div className="absolute left-full ml-3 px-3.5 py-1.5 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 flex items-center gap-1.5">
                <span>{item.tooltip}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 3. BOTTOM: Settings & Profile Stack */}
      <div className="flex flex-col items-center gap-1.5 shrink-0 w-full">
        <div className="w-8 h-px bg-slate-200/80 my-0.5" />
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
                'w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all duration-150 group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900',
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 active:scale-[0.96]'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                )}
                strokeWidth={2}
              />

              {/* Flyout Tooltip */}
              <div className="absolute left-full ml-3 px-3.5 py-1.5 bg-white border border-slate-200/90 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/5 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 delay-150 pointer-events-none z-50 translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0 flex items-center gap-1.5">
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

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
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NavStatusPill } from '../navigation/NavStatusPill';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Navigation Cockpit', path: '/app', icon: Navigation },
  { name: 'Live Map View', path: '/app/map', icon: Map },
  { name: 'Tunnel & Outage Mode', path: '/app/tunnel', icon: Radio },
  { name: 'Journey History', path: '/app/history', icon: Clock },
  { name: 'Learning Insights', path: '/app/learning', icon: BrainCircuit },
  { name: 'Sensor Diagnostics', path: '/app/diagnostics', icon: Activity },
  { name: 'System Settings', path: '/app/settings', icon: Settings },
  { name: 'Driver Profile', path: '/app/profile', icon: User },
];

interface SidebarProps {
  onClose?: () => void;
  isDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isDrawer = false }) => {
  const location = useLocation();

  const isItemActive = (itemPath: string) => {
    if (itemPath === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  return (
    <aside className="w-[280px] bg-white/95 backdrop-blur-xl border-r border-slate-200/80 flex flex-col h-full select-none shrink-0 shadow-2xl z-50">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
        <Link
          to="/app"
          onClick={onClose}
          className="flex items-center gap-3 group transition-opacity hover:opacity-95 focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/25 text-white shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
            <Navigation className="w-5 h-5 fill-white/20 stroke-white rotate-[-20deg]" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-bold text-slate-900 tracking-tight leading-tight group-hover:text-brand-700 transition-colors">
              YatraSaarthi
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 leading-none mt-0.5">
              Intelligent Navigation
            </span>
          </div>
        </Link>

        {isDrawer && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Real-Time GNSS / DR Status Strip */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <NavStatusPill expanded showSecondary className="w-full justify-start text-[11px]" />
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation & Controls
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={twMerge(
                clsx(
                  'group relative flex items-center justify-between px-3.5 h-11 rounded-xl text-[13.5px] font-medium transition-all duration-150 ease-in-out',
                  isActive
                    ? 'bg-brand-50/90 text-brand-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Active Accent Pill */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-600 rounded-r-full"
                    aria-hidden="true"
                  />
                )}

                <Icon
                  className={clsx(
                    'w-4.5 h-4.5 shrink-0 transition-colors duration-150',
                    isActive
                      ? 'text-brand-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />

                <span className="truncate">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom InEKF Status Card */}
      <div className="p-3.5 mx-3.5 mb-3.5 mt-auto rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[12px] font-semibold text-slate-800 tracking-tight">
              InEKF Core Engine
            </span>
          </div>
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 leading-none">
            READY
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
          Zero-drift dead reckoning prepared for GNSS-denied environments.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;

import { Link, useLocation } from 'react-router-dom';
import {
  Navigation,
  Map,
  Clock,
  BrainCircuit,
  Settings,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/app', icon: Navigation },
  { name: 'Map', path: '/app/map', icon: Map },
  { name: 'History', path: '/app/history', icon: Clock },
  { name: 'Learning Insights', path: '/app/learning', icon: BrainCircuit },
  { name: 'Diagnostics', path: '/app/diagnostics', icon: Activity },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  const isItemActive = (itemPath: string) => {
    if (itemPath === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  return (
    <aside className="w-[268px] min-w-[268px] max-w-[268px] bg-white border-r border-slate-200/80 flex flex-col h-full select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 shrink-0">
        <Link
          to="/app"
          className="flex items-center gap-3 group transition-opacity hover:opacity-95 focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/20 text-white shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
            <Navigation className="w-5 h-5 fill-white/20 stroke-white rotate-[-20deg]" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold text-slate-900 tracking-tight leading-tight group-hover:text-brand-700 transition-colors">
              YatraSaarthi
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 leading-none mt-0.5">
              Vehicle Intelligence
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 py-4 px-3.5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={twMerge(
                clsx(
                  'group relative flex items-center gap-3 px-3.5 h-11 rounded-lg text-[14px] font-medium transition-all duration-150 ease-in-out',
                  isActive
                    ? 'bg-brand-50/90 text-brand-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              )}
            >
              {/* Active Indicator Accent Bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-600 rounded-r-full"
                  aria-hidden="true"
                />
              )}

              <Icon
                className={clsx(
                  'w-5 h-5 shrink-0 transition-colors duration-150',
                  isActive
                    ? 'text-brand-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />

              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status Card */}
      <div className="p-3.5 mx-3.5 mb-3.5 mt-auto rounded-xl bg-slate-50/90 border border-slate-200/75 transition-all">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
            </span>
            <span className="text-[12.5px] font-semibold text-slate-800 tracking-tight">
              IDR Engine Active
            </span>
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 leading-none">
            Online
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-slate-500 font-normal pl-4">
          Ready for GNSS-denied environments.
        </p>
      </div>
    </aside>
  );
}
